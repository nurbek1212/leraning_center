import { query } from '../config/db';
import { env } from '../config/env';

export const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Joriy oy ('YYYY-MM'), Toshkent vaqti bo'yicha
export function currentPeriod(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }).slice(0, 7);
}

export interface Debt {
  price: number;
  paid: number;
  debt: number;
}

// Talabaning guruh bo'yicha shu oydagi to'lagan va qolgan summasi (talaba guruhda bo'lmasa null)
export async function getDebt(studentId: number, groupId: number, period: string): Promise<Debt | null> {
  const rows = await query<{ price: number; paid: number }>(
    `SELECT g.price,
            COALESCE((SELECT SUM(p.amount) FROM payments p
                      WHERE p.student_id = gs.student_id AND p.group_id = g.id
                        AND p.period = ? AND p.status = 'paid'), 0) AS paid
     FROM group_students gs
     JOIN \`groups\` g ON g.id = gs.group_id
     WHERE gs.student_id = ? AND gs.group_id = ?`,
    [period, studentId, groupId]
  );
  if (!rows.length) return null;
  const price = Number(rows[0].price);
  const paid = Number(rows[0].paid);
  return { price, paid, debt: Math.max(0, price - paid) };
}

export const studentReturnUrl = () => `${env.clientUrl}/student/payments?paid=1`;

// Payme checkout havolasi: base64("m=...;ac.order_id=...;a=<tiyin>;...")
export function paymeCheckoutUrl(paymentId: number, amountSom: number): string {
  const params = [
    `m=${env.payme.merchantId}`,
    `ac.order_id=${paymentId}`,
    `a=${amountSom * 100}`, // Payme summani tiyinda kutadi
    'l=uz',
    `c=${studentReturnUrl()}`,
  ].join(';');
  return `${env.payme.checkoutUrl}/${Buffer.from(params, 'utf8').toString('base64')}`;
}

// Click to'lov havolasi (summa "N.NN" formatida, so'mda)
export function clickPayUrl(paymentId: number, amountSom: number): string {
  const qs = new URLSearchParams({
    service_id: env.click.serviceId,
    merchant_id: env.click.merchantId,
    amount: amountSom.toFixed(2),
    transaction_param: String(paymentId),
    return_url: studentReturnUrl(),
  });
  return `https://my.click.uz/services/pay?${qs.toString()}`;
}
