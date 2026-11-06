import type { AttendanceStatus, PaymentMethod, PaymentStatus, Role } from '../types';

export const roleLabels: Record<Role, string> = {
  admin: 'Administrator',
  teacher: 'Ustoz',
  student: 'Talaba',
};

export const attendanceLabels: Record<AttendanceStatus, string> = {
  present: 'Keldi',
  absent: 'Kelmadi',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Naqd',
  card: 'Karta',
  transfer: "O'tkazma",
  payme: 'Payme',
  click: 'Click',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Kutilmoqda',
  paid: "To'langan",
  cancelled: 'Bekor qilingan',
};

// '2026-10-20' -> '20.10.2026'
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

// Bugungi sana (mahalliy vaqt bo'yicha) 'YYYY-MM-DD' ko'rinishida
export function todayStr(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function homePath(role: Role): string {
  return `/${role}`;
}

export const isEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

// ---------- Pul va oylar ----------

// 1250000 -> "1 250 000 so'm"
export function formatMoney(value: number | null | undefined): string {
  const n = Math.round(Number(value) || 0);
  return `${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`.replace(/^/, n < 0 ? '−' : '');
}

export const MONTHS = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

export const currentPeriod = () => todayStr().slice(0, 7);

// '2026-11' -> 'Noyabr 2026'
export function periodLabel(period: string): string {
  const [y, m] = period.split('-');
  const name = MONTHS[Number(m) - 1];
  return name ? `${name} ${y}` : period;
}

// ---------- Ball va foiz ----------

export const percentOf = (value: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);

// Jadvaldagi sonlar: 17.0 -> "17", 16.5 -> "16.5"
export const fmtScore = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));

// ---------- Dars jadvali ----------
// Jadval matni "Du-Chor-Ju 14:00" ko'rinishida saqlanadi
export const WEEK_DAYS = ['Du', 'Sesh', 'Chor', 'Pay', 'Ju', 'Sha', 'Yak'];

export function parseSchedule(schedule: string | null): { days: string[]; time: string } {
  if (!schedule) return { days: [], time: '' };
  const idx = schedule.lastIndexOf(' ');
  if (idx === -1) return { days: [], time: '' };
  const days = schedule
    .slice(0, idx)
    .split('-')
    .filter((d) => WEEK_DAYS.includes(d));
  const time = schedule.slice(idx + 1);
  return { days, time: /^\d{2}:\d{2}$/.test(time) ? time : '' };
}

export function buildSchedule(days: string[], time: string): string {
  const ordered = WEEK_DAYS.filter((d) => days.includes(d));
  return `${ordered.join('-')} ${time}`.trim();
}
