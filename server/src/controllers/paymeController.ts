import { timingSafeEqual } from 'crypto';
import { ErrorRequestHandler, Request, Response } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import { execute, query, transaction } from '../config/db';
import { env } from '../config/env';

/*
 * Payme Merchant API (JSON-RPC 2.0).
 * Hujjat: https://developer.help.paycom.uz/protokol-merchant-api/
 *
 * - Summalar tiyinda (1 so'm = 100 tiyin), vaqt millisekundlarda.
 * - Har qanday javob HTTP 200 bilan qaytadi (xato ham JSON-RPC "error" ichida).
 * - Account maydoni: order_id = payments.id
 * - Tranzaksiya holatlari: 1 yaratilgan, 2 bajarilgan, -1 bekor qilingan, -2 bajarilgandan keyin bekor qilingan.
 */

const TIMEOUT_MS = 43_200_000; // 12 soat: undan keyin kutayotgan tranzaksiya bekor qilinadi (sabab 4)

type Msg = { ru: string; uz: string; en: string };

class RpcError extends Error {
  code: number;
  localized: Msg;
  data?: string;

  constructor(code: number, localized: Msg, data?: string) {
    super(localized.en);
    this.code = code;
    this.localized = localized;
    this.data = data;
  }
}

const Errors = {
  notPost: () => new RpcError(-32300, { ru: 'Метод запроса не POST', uz: "So'rov usuli POST emas", en: 'Request method is not POST' }),
  parse: () => new RpcError(-32700, { ru: 'Ошибка парсинга JSON', uz: "JSON o'qishda xatolik", en: 'JSON parse error' }),
  invalidRequest: () => new RpcError(-32600, { ru: 'Неверный RPC-запрос', uz: "Noto'g'ri RPC so'rov", en: 'Invalid RPC request' }),
  methodNotFound: (method: string) =>
    new RpcError(-32601, { ru: 'Метод не найден', uz: 'Metod topilmadi', en: 'Method not found' }, method),
  noAccess: () =>
    new RpcError(-32504, { ru: 'Недостаточно привилегий для выполнения метода', uz: "Metodni bajarish uchun huquq yetarli emas", en: 'Insufficient privileges to perform this method' }),
  system: () => new RpcError(-32400, { ru: 'Системная ошибка', uz: 'Tizim xatosi', en: 'System error' }),
  invalidAmount: () => new RpcError(-31001, { ru: 'Неверная сумма', uz: "Noto'g'ri summa", en: 'Incorrect amount' }),
  txNotFound: () => new RpcError(-31003, { ru: 'Транзакция не найдена', uz: 'Tranzaksiya topilmadi', en: 'Transaction not found' }),
  cantPerform: () =>
    new RpcError(-31008, { ru: 'Невозможно выполнить операцию', uz: "Operatsiyani bajarib bo'lmaydi", en: 'Unable to perform operation' }),
  orderNotFound: () =>
    new RpcError(-31050, { ru: 'Заказ не найден', uz: 'Buyurtma topilmadi', en: 'Order not found' }, 'order_id'),
  orderNotPayable: () =>
    new RpcError(-31051, { ru: 'Заказ уже оплачен или отменён', uz: "Buyurtma allaqachon to'langan yoki bekor qilingan", en: 'Order is already paid or cancelled' }, 'order_id'),
  orderBusy: () =>
    new RpcError(-31099, { ru: 'Заказ ожидает оплаты другой транзакцией', uz: "Buyurtma boshqa to'lov kutmoqda", en: 'Order is awaiting another payment' }, 'order_id'),
};

interface TxRow {
  id: number;
  payment_id: number;
  provider_trans_id: string;
  provider_time: number;
  amount_tiyin: number;
  state: number;
  reason: number | null;
  create_time: number;
  perform_time: number;
  cancel_time: number;
}

interface PaymentRow {
  id: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
}

type Outcome<T> = { error: RpcError } | { result: T };

const n = (v: unknown) => Number(v ?? 0);
const expired = (tx: TxRow) => Date.now() - n(tx.provider_time) > TIMEOUT_MS;

// ---------- Yordamchi funksiyalar ----------

function isAuthorized(req: Request): boolean {
  const header = req.headers.authorization || '';
  if (!env.payme.key || !header.startsWith('Basic ')) return false;
  const expected = Buffer.from(`Paycom:${env.payme.key}`, 'utf8');
  const given = Buffer.from(header.slice(6).trim(), 'base64');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function parseOrderId(account: unknown): number {
  const raw = (account as { order_id?: unknown } | null | undefined)?.order_id;
  const id = Number(raw);
  if (raw === undefined || raw === null || raw === '' || !Number.isInteger(id) || id <= 0) {
    throw Errors.orderNotFound();
  }
  return id;
}

function parseAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0) throw Errors.invalidAmount();
  return amount;
}

function parseId(params: Record<string, unknown>): string {
  if (typeof params.id !== 'string' || !params.id || params.id.length > 64) throw Errors.invalidRequest();
  return params.id;
}

function validateOrder(payment: PaymentRow | undefined, amountTiyin: number) {
  if (!payment) throw Errors.orderNotFound();
  if (payment.status !== 'pending') throw Errors.orderNotPayable();
  if (amountTiyin !== n(payment.amount) * 100) throw Errors.invalidAmount();
}

async function lockTx(conn: PoolConnection, paymeId: string): Promise<TxRow> {
  const [tx] = await query<TxRow>(
    "SELECT * FROM payment_transactions WHERE provider = 'payme' AND provider_trans_id = ? FOR UPDATE",
    [paymeId],
    conn
  );
  if (!tx) throw Errors.txNotFound();
  return tx;
}

async function cancelRow(conn: PoolConnection, tx: TxRow, reason: number, newState: -1 | -2) {
  const cancelTime = Date.now();
  await execute('UPDATE payment_transactions SET state = ?, reason = ?, cancel_time = ? WHERE id = ?', [
    newState,
    reason,
    cancelTime,
    tx.id,
  ], conn);
  tx.state = newState;
  tx.reason = reason;
  tx.cancel_time = cancelTime;
}

const createResult = (tx: TxRow) => ({
  create_time: n(tx.create_time),
  transaction: String(tx.id),
  state: tx.state,
});

const performResult = (tx: TxRow) => ({
  transaction: String(tx.id),
  perform_time: n(tx.perform_time),
  state: tx.state,
});

// ---------- Metodlar ----------

async function checkPerformTransaction(params: Record<string, unknown>) {
  const orderId = parseOrderId(params.account);
  const amount = parseAmount(params.amount);
  const [payment] = await query<PaymentRow>('SELECT id, amount, status FROM payments WHERE id = ?', [orderId]);
  validateOrder(payment, amount);
  return { allow: true };
}

async function createTransaction(params: Record<string, unknown>) {
  const paymeId = parseId(params);
  const orderId = parseOrderId(params.account);
  const amount = parseAmount(params.amount);
  const time = Number(params.time);
  const providerTime = Number.isFinite(time) && time > 0 ? time : Date.now();

  const outcome = await transaction<Outcome<ReturnType<typeof createResult>>>(async (conn) => {
    // Shu id bilan tranzaksiya oldin yaratilgan bo'lsa (Payme qayta so'rasa), o'shani qaytaramiz
    const [existing] = await query<TxRow>(
      "SELECT * FROM payment_transactions WHERE provider = 'payme' AND provider_trans_id = ? FOR UPDATE",
      [paymeId],
      conn
    );
    if (existing) {
      if (existing.state !== 1) return { error: Errors.cantPerform() };
      if (expired(existing)) {
        await cancelRow(conn, existing, 4, -1);
        return { error: Errors.cantPerform() };
      }
      return { result: createResult(existing) };
    }

    // Buyurtmani qulflaymiz, shunda bir buyurtmaga parallel ikkita tranzaksiya yaratilmaydi
    const [payment] = await query<PaymentRow>('SELECT id, amount, status FROM payments WHERE id = ? FOR UPDATE', [orderId], conn);
    validateOrder(payment, amount);

    const active = await query<TxRow>(
      "SELECT * FROM payment_transactions WHERE payment_id = ? AND provider = 'payme' AND state = 1 FOR UPDATE",
      [orderId],
      conn
    );
    for (const other of active) {
      if (expired(other)) await cancelRow(conn, other, 4, -1);
      else return { error: Errors.orderBusy() };
    }

    const createTime = Date.now();
    const inserted = await execute(
      `INSERT INTO payment_transactions
         (payment_id, provider, provider_trans_id, provider_time, amount_tiyin, state, create_time)
       VALUES (?, 'payme', ?, ?, ?, 1, ?)`,
      [orderId, paymeId, providerTime, amount, createTime],
      conn
    );
    return { result: { create_time: createTime, transaction: String(inserted.insertId), state: 1 } };
  });

  if ('error' in outcome) throw outcome.error;
  return outcome.result;
}

async function performTransaction(params: Record<string, unknown>) {
  const paymeId = parseId(params);

  const outcome = await transaction<Outcome<ReturnType<typeof performResult>>>(async (conn) => {
    const tx = await lockTx(conn, paymeId);
    if (tx.state === 2) return { result: performResult(tx) };
    if (tx.state !== 1) return { error: Errors.cantPerform() };

    if (expired(tx)) {
      await cancelRow(conn, tx, 4, -1);
      return { error: Errors.cantPerform() };
    }

    const [payment] = await query<PaymentRow>('SELECT id, amount, status FROM payments WHERE id = ? FOR UPDATE', [tx.payment_id], conn);
    // Buyurtma boshqa yo'l bilan to'langan yoki bekor qilingan bo'lsa, ikki marta to'lanmasin
    if (!payment || payment.status !== 'pending') return { error: Errors.cantPerform() };

    const performTime = Date.now();
    await execute('UPDATE payment_transactions SET state = 2, perform_time = ? WHERE id = ?', [performTime, tx.id], conn);
    await execute("UPDATE payments SET status = 'paid', method = 'payme', paid_at = NOW() WHERE id = ?", [tx.payment_id], conn);
    tx.state = 2;
    tx.perform_time = performTime;
    return { result: performResult(tx) };
  });

  if ('error' in outcome) throw outcome.error;
  return outcome.result;
}

// Bajarilgan tranzaksiyani ham bekor qilish (qaytarish) mumkin: to'lov "cancelled" bo'ladi va qarz qayta paydo bo'ladi.
async function cancelTransaction(params: Record<string, unknown>) {
  const paymeId = parseId(params);
  const reasonNum = Number(params.reason);
  const reason = Number.isInteger(reasonNum) ? reasonNum : 10;

  return transaction(async (conn) => {
    const tx = await lockTx(conn, paymeId);
    if (tx.state === 1) {
      await cancelRow(conn, tx, reason, -1);
    } else if (tx.state === 2) {
      await cancelRow(conn, tx, reason, -2);
      await execute("UPDATE payments SET status = 'cancelled' WHERE id = ?", [tx.payment_id], conn);
    }
    // Allaqachon bekor qilingan bo'lsa, o'sha natija qayta qaytariladi
    return { transaction: String(tx.id), cancel_time: n(tx.cancel_time), state: tx.state };
  });
}

async function checkTransaction(params: Record<string, unknown>) {
  const paymeId = parseId(params);
  const [tx] = await query<TxRow>(
    "SELECT * FROM payment_transactions WHERE provider = 'payme' AND provider_trans_id = ?",
    [paymeId]
  );
  if (!tx) throw Errors.txNotFound();
  return {
    create_time: n(tx.create_time),
    perform_time: n(tx.perform_time),
    cancel_time: n(tx.cancel_time),
    transaction: String(tx.id),
    state: tx.state,
    reason: tx.reason ?? null,
  };
}

async function getStatement(params: Record<string, unknown>) {
  const from = Number(params.from);
  const to = Number(params.to);
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw Errors.invalidRequest();

  const rows = await query<TxRow>(
    `SELECT * FROM payment_transactions
     WHERE provider = 'payme' AND provider_time >= ? AND provider_time <= ?
     ORDER BY create_time ASC`,
    [from, to]
  );
  return {
    transactions: rows.map((tx) => ({
      id: tx.provider_trans_id,
      time: n(tx.provider_time),
      amount: n(tx.amount_tiyin),
      account: { order_id: tx.payment_id },
      create_time: n(tx.create_time),
      perform_time: n(tx.perform_time),
      cancel_time: n(tx.cancel_time),
      transaction: String(tx.id),
      state: tx.state,
      reason: tx.reason ?? null,
    })),
  };
}

const methods: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
  CheckPerformTransaction: checkPerformTransaction,
  CreateTransaction: createTransaction,
  PerformTransaction: performTransaction,
  CancelTransaction: cancelTransaction,
  CheckTransaction: checkTransaction,
  GetStatement: getStatement,
};

// ---------- HTTP qatlami ----------

function sendError(res: Response, id: unknown, err: RpcError) {
  res.status(200).json({
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code: err.code, message: err.localized, data: err.data },
  });
}

export async function paymeHandler(req: Request, res: Response) {
  const body = req.body as { method?: unknown; params?: unknown; id?: unknown } | undefined;
  const id = body?.id ?? null;

  try {
    if (req.method !== 'POST') throw Errors.notPost();
    if (!isAuthorized(req)) throw Errors.noAccess();

    if (!body || typeof body.method !== 'string' || typeof body.params !== 'object' || body.params === null) {
      throw Errors.invalidRequest();
    }
    const handler = methods[body.method];
    if (!handler) throw Errors.methodNotFound(body.method);

    const result = await handler(body.params as Record<string, unknown>);
    res.status(200).json({ jsonrpc: '2.0', id, result });
  } catch (err) {
    if (err instanceof RpcError) return sendError(res, id, err);
    console.error('Payme xatosi:', err);
    sendError(res, id, Errors.system());
  }
}

// JSON noto'g'ri bo'lsa (-32700)
export const paymeParseError: ErrorRequestHandler = (_err, _req, res, _next) => {
  sendError(res, null, Errors.parse());
};
