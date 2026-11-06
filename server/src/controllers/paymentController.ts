import { clickEnabled, paymeEnabled } from '../config/env';
import { execute, query } from '../config/db';
import { isStudentInGroup } from '../utils/access';
import { ApiError, asyncHandler, ListQuery, ok, paged } from '../utils/http';
import { clickPayUrl, currentPeriod, getDebt, paymeCheckoutUrl } from '../utils/payments';

const MANUAL_METHODS = ['cash', 'card', 'transfer'];

const PAYMENT_SELECT = `
  SELECT p.id, p.student_id, p.group_id, p.period, p.amount, p.method, p.status, p.note,
         p.created_at, p.paid_at,
         s.full_name AS student_name, g.name AS group_name, rec.full_name AS recorded_by_name
  FROM payments p
  JOIN users s ON s.id = p.student_id
  JOIN \`groups\` g ON g.id = p.group_id
  LEFT JOIN users rec ON rec.id = p.created_by`;

async function findPayment(id: number) {
  const rows = await query<any>(`${PAYMENT_SELECT} WHERE p.id = ?`, [id]);
  return rows[0];
}

// ---------- Admin ----------

// To'lovlar tarixi (qidiruv, oy va holat bo'yicha filtr, pagination)
export const list = asyncHandler(async (req, res) => {
  const { page, limit, search, period, status } = req.query as unknown as ListQuery & {
    period?: string;
    status?: string;
  };
  const like = `%${search}%`;

  const where: string[] = ['(s.full_name LIKE ? OR g.name LIKE ?)'];
  const params: unknown[] = [like, like];
  if (period) {
    where.push('p.period = ?');
    params.push(period);
  }
  if (status) {
    where.push('p.status = ?');
    params.push(status);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [{ total }] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM payments p
     JOIN users s ON s.id = p.student_id
     JOIN \`groups\` g ON g.id = p.group_id ${whereSql}`,
    params
  );
  const items = await query(`${PAYMENT_SELECT} ${whereSql} ORDER BY p.id DESC LIMIT ? OFFSET ?`, [
    ...params,
    limit,
    (page - 1) * limit,
  ]);

  ok(res, paged(items, Number(total), page, limit));
});

// Admin naqd / karta / o'tkazma to'lovini qo'lda kiritadi
export const create = asyncHandler(async (req, res) => {
  const { studentId, groupId, period, amount, method, note } = req.body;

  if (!(await isStudentInGroup(groupId, studentId))) {
    throw new ApiError(400, "Bu talaba tanlangan guruhga a'zo emas");
  }

  const result = await execute(
    `INSERT INTO payments (student_id, group_id, period, amount, method, status, note, created_by, paid_at)
     VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, NOW())`,
    [studentId, groupId, period, amount, method, note || null, req.user!.id]
  );
  ok(res, await findPayment(result.insertId), "To'lov qabul qilindi", 201);
});

// Qo'lda kiritilgan to'lovni bekor qilish. Payme/Click to'lovlari bu yerdan bekor qilinmaydi:
// ularni provayder kabinetidan qaytarish kerak (CancelTransaction orqali tizimga o'zi keladi).
export const cancel = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query<{ method: string; status: string }>('SELECT method, status FROM payments WHERE id = ?', [id]);
  if (!rows.length) throw new ApiError(404, "To'lov topilmadi");
  if (!MANUAL_METHODS.includes(rows[0].method)) {
    throw new ApiError(400, "Online to'lovni Payme/Click kabineti orqali qaytarish kerak");
  }
  if (rows[0].status !== 'paid') throw new ApiError(400, "Faqat to'langan to'lovni bekor qilish mumkin");

  await execute("UPDATE payments SET status = 'cancelled' WHERE id = ? AND status = 'paid'", [id]);
  ok(res, await findPayment(id), "To'lov bekor qilindi");
});

// Tanlangan oy bo'yicha har bir talaba-guruh juftligi: narx, to'langan, qarz
export const debts = asyncHandler(async (req, res) => {
  const period = (req.query as unknown as { period?: string }).period || currentPeriod();

  const rows = await query<any>(
    `SELECT u.id AS student_id, u.full_name AS student_name, u.phone,
            g.id AS group_id, g.name AS group_name, g.price,
            COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount END), 0) AS paid
     FROM group_students gs
     JOIN users u ON u.id = gs.student_id
     JOIN \`groups\` g ON g.id = gs.group_id
     LEFT JOIN payments p
            ON p.student_id = gs.student_id AND p.group_id = gs.group_id AND p.period = ?
     WHERE g.price > 0
     GROUP BY u.id, u.full_name, u.phone, g.id, g.name, g.price
     ORDER BY u.full_name, g.name`,
    [period]
  );

  const items = rows.map((r) => {
    const price = Number(r.price);
    const paid = Number(r.paid);
    return { ...r, price, paid, debt: Math.max(0, price - paid) };
  });
  ok(res, { period, items });
});

// ---------- Talaba ----------

export const myPayments = asyncHandler(async (req, res) => {
  const studentId = req.user!.id;
  const period = (req.query as unknown as { period?: string }).period || currentPeriod();

  const groups = await query<any>(
    `SELECT g.id AS group_id, g.name AS group_name, s.name AS subject_name, g.price,
            COALESCE((SELECT SUM(p.amount) FROM payments p
                      WHERE p.student_id = gs.student_id AND p.group_id = g.id
                        AND p.period = ? AND p.status = 'paid'), 0) AS paid
     FROM group_students gs
     JOIN \`groups\` g ON g.id = gs.group_id
     JOIN subjects s ON s.id = g.subject_id
     WHERE gs.student_id = ?
     ORDER BY g.name`,
    [period, studentId]
  );

  const history = await query(
    `SELECT p.id, p.group_id, g.name AS group_name, p.period, p.amount, p.method, p.status, p.created_at, p.paid_at
     FROM payments p JOIN \`groups\` g ON g.id = p.group_id
     WHERE p.student_id = ?
     ORDER BY p.id DESC LIMIT 100`,
    [studentId]
  );

  ok(res, {
    period,
    providers: { payme: paymeEnabled, click: clickEnabled },
    groups: groups.map((g) => {
      const price = Number(g.price);
      const paid = Number(g.paid);
      return { ...g, price, paid, debt: Math.max(0, price - paid) };
    }),
    history,
  });
});

// Online to'lov boshlash: buyurtma (pending to'lov) yaratib, Payme/Click havolasini qaytaradi.
// Summa serverda hisoblanadi (klientdan olinmaydi), shuning uchun uni o'zgartirib bo'lmaydi.
export const checkout = asyncHandler(async (req, res) => {
  const studentId = req.user!.id;
  const { groupId, period, provider } = req.body as { groupId: number; period: string; provider: 'payme' | 'click' };

  if (provider === 'payme' && !paymeEnabled) throw new ApiError(503, 'Payme hozircha sozlanmagan');
  if (provider === 'click' && !clickEnabled) throw new ApiError(503, 'Click hozircha sozlanmagan');

  const info = await getDebt(studentId, groupId, period);
  if (!info) throw new ApiError(400, "Siz bu guruhga a'zo emassiz");
  if (info.price <= 0) throw new ApiError(400, "Bu guruh uchun to'lov narxi belgilanmagan");
  if (info.debt <= 0) throw new ApiError(400, "Bu oy uchun qarzingiz yo'q");

  // Oxirgi 24 soat ichidagi aynan shunday kutilayotgan buyurtma bo'lsa, o'shani qayta ishlatamiz
  const existing = await query<{ id: number }>(
    `SELECT id FROM payments
     WHERE student_id = ? AND group_id = ? AND period = ? AND amount = ? AND method = ?
       AND status = 'pending' AND created_at > (NOW() - INTERVAL 1 DAY)
     ORDER BY id DESC LIMIT 1`,
    [studentId, groupId, period, info.debt, provider]
  );

  let paymentId: number;
  if (existing.length) {
    paymentId = existing[0].id;
  } else {
    const result = await execute(
      `INSERT INTO payments (student_id, group_id, period, amount, method, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [studentId, groupId, period, info.debt, provider, studentId]
    );
    paymentId = result.insertId;
  }

  const url = provider === 'payme' ? paymeCheckoutUrl(paymentId, info.debt) : clickPayUrl(paymentId, info.debt);
  ok(res, { paymentId, provider, amount: info.debt, url });
});
