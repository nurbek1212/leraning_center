import { createHash, timingSafeEqual } from 'crypto';
import { ErrorRequestHandler, Request, Response } from 'express';
import { execute, query, transaction } from '../config/db';
import { env } from '../config/env';

/*
 * Click Merchant API (SHOP-API): Prepare (action=0) va Complete (action=1).
 * Hujjat: https://docs.click.uz/en/?p=15
 *
 * - Prepare imzosi:  md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
 * - Complete imzosi: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 * - merchant_trans_id = payments.id, amount so'mda (float), javoblar HTTP 200 va JSON ({ error, error_note, ... }).
 */

const NOTES: Record<number, string> = {
  0: 'Success',
  [-1]: 'SIGN CHECK FAILED!',
  [-2]: 'Incorrect parameter amount',
  [-3]: 'Action not found',
  [-4]: 'Already paid',
  [-5]: 'User does not exist',
  [-6]: 'Transaction does not exist',
  [-7]: 'Failed to update user',
  [-8]: 'Error in request from click',
  [-9]: 'Transaction cancelled',
};

type Out = (code: number, extra?: Record<string, unknown>) => Record<string, unknown>;
type Body = Record<string, unknown>;

interface TxRow {
  id: number;
  payment_id: number;
  provider_trans_id: string;
  state: number;
}

interface PaymentRow {
  id: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));
const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex');

function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a.toLowerCase(), 'utf8');
  const B = Buffer.from(b.toLowerCase(), 'utf8');
  return A.length === B.length && timingSafeEqual(A, B);
}

function parseOrderId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Click summani so'mda (float) yuboradi; tiyinga o'tkazib butun son sifatida solishtiramiz
function toTiyin(raw: string): number | null {
  const value = parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

async function prepare(b: Body, out: Out) {
  const orderId = parseOrderId(str(b.merchant_trans_id));
  if (orderId === null) return out(-5);
  const amountTiyin = toTiyin(str(b.amount));
  if (amountTiyin === null) return out(-2);
  const clickId = str(b.click_trans_id);

  return transaction(async (conn) => {
    const [payment] = await query<PaymentRow>('SELECT id, amount, status FROM payments WHERE id = ? FOR UPDATE', [orderId], conn);
    if (!payment) return out(-5);
    if (payment.status === 'paid') return out(-4);
    if (payment.status === 'cancelled') return out(-9);
    if (amountTiyin !== Number(payment.amount) * 100) return out(-2);

    // Click Prepare ni qayta yuborsa, avvalgi merchant_prepare_id qaytariladi
    const [existing] = await query<TxRow>(
      "SELECT id, payment_id, provider_trans_id, state FROM payment_transactions WHERE provider = 'click' AND provider_trans_id = ? FOR UPDATE",
      [clickId],
      conn
    );
    if (existing) {
      if (existing.state === 2) return out(-4);
      if (existing.state < 0) return out(-9);
      return out(0, { merchant_prepare_id: existing.id });
    }

    const now = Date.now();
    const inserted = await execute(
      `INSERT INTO payment_transactions
         (payment_id, provider, provider_trans_id, provider_time, amount_tiyin, state, create_time)
       VALUES (?, 'click', ?, ?, ?, 1, ?)`,
      [orderId, clickId, now, amountTiyin, now],
      conn
    );
    return out(0, { merchant_prepare_id: inserted.insertId });
  });
}

async function complete(b: Body, out: Out, prepareIdRaw: string) {
  const orderId = parseOrderId(str(b.merchant_trans_id));
  if (orderId === null) return out(-5);
  const prepareId = Number(prepareIdRaw);
  if (!Number.isInteger(prepareId) || prepareId <= 0) return out(-6);
  const amountTiyin = toTiyin(str(b.amount));
  if (amountTiyin === null) return out(-2);
  const clickId = str(b.click_trans_id);
  const clickError = Number(b.error) || 0;

  return transaction(async (conn) => {
    const [tx] = await query<TxRow>(
      "SELECT id, payment_id, provider_trans_id, state FROM payment_transactions WHERE id = ? AND provider = 'click' FOR UPDATE",
      [prepareId],
      conn
    );
    if (!tx || tx.provider_trans_id !== clickId) return out(-6);

    const [payment] = await query<PaymentRow>('SELECT id, amount, status FROM payments WHERE id = ? FOR UPDATE', [tx.payment_id], conn);
    if (!payment || payment.id !== orderId) return out(-5);
    if (amountTiyin !== Number(payment.amount) * 100) return out(-2);

    if (tx.state === 2) return out(-4, { merchant_confirm_id: tx.id });
    if (tx.state < 0) return out(-9);

    // Click xato kodi yuborgan bo'lsa (karta rad etilgan va h.k.), tranzaksiya bekor qilinadi.
    // Buyurtmaning o'zi "pending" qoladi, talaba qayta urinib ko'ra oladi.
    if (clickError < 0) {
      await execute('UPDATE payment_transactions SET state = -1, reason = ?, cancel_time = ? WHERE id = ?', [
        Math.abs(clickError),
        Date.now(),
        tx.id,
      ], conn);
      return out(-9);
    }

    if (payment.status === 'paid') return out(-4);
    if (payment.status === 'cancelled') return out(-9);

    await execute('UPDATE payment_transactions SET state = 2, perform_time = ? WHERE id = ?', [Date.now(), tx.id], conn);
    await execute("UPDATE payments SET status = 'paid', method = 'click', paid_at = NOW() WHERE id = ?", [payment.id], conn);
    return out(0, { merchant_confirm_id: tx.id });
  });
}

export async function clickHandler(req: Request, res: Response) {
  const b: Body = (req.body && typeof req.body === 'object' ? req.body : {}) as Body;
  const base = { click_trans_id: str(b.click_trans_id), merchant_trans_id: str(b.merchant_trans_id) };
  const out: Out = (code, extra = {}) => ({ ...base, ...extra, error: code, error_note: NOTES[code] });

  try {
    if (req.method !== 'POST') return res.status(200).json(out(-8));

    const required = ['click_trans_id', 'service_id', 'merchant_trans_id', 'amount', 'action', 'sign_time', 'sign_string'];
    if (required.some((key) => str(b[key]) === '')) return res.status(200).json(out(-8));

    if (!env.click.secretKey) return res.status(200).json(out(-1));

    const action = Number(b.action);
    const prepareId = str(b.merchant_prepare_id);
    if (action === 1 && prepareId === '') return res.status(200).json(out(-8));

    const raw =
      str(b.click_trans_id) +
      str(b.service_id) +
      env.click.secretKey +
      str(b.merchant_trans_id) +
      (action === 1 ? prepareId : '') +
      str(b.amount) +
      str(b.action) +
      str(b.sign_time);
    if (!safeEqual(md5(raw), str(b.sign_string))) return res.status(200).json(out(-1));

    if (str(b.service_id) !== env.click.serviceId) return res.status(200).json(out(-8));

    if (action === 0) return res.status(200).json(await prepare(b, out));
    if (action === 1) return res.status(200).json(await complete(b, out, prepareId));
    return res.status(200).json(out(-3));
  } catch (err) {
    console.error('Click xatosi:', err);
    return res.status(200).json(out(-7));
  }
}

// So'rov noto'g'ri formatda kelsa
export const clickParseError: ErrorRequestHandler = (_err, _req, res, _next) => {
  res.status(200).json({ error: -8, error_note: NOTES[-8] });
};
