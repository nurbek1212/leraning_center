import { ReactNode } from 'react';

export type Tone = 'gray' | 'blue' | 'green' | 'red' | 'amber';

const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  red: 'bg-rose-50 text-rose-700 ring-rose-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
};

const dots: Record<Tone, string> = {
  gray: 'bg-slate-400',
  blue: 'bg-brand-500',
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  amber: 'bg-amber-500',
};

export default function Badge({ children, tone = 'gray', dot }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
}

// Foizga (0–100) qarab rang: 86+ yashil, 71+ ko'k, 56+ sariq, undan past qizil
export function scoreTone(percent: number): Tone {
  if (percent >= 86) return 'green';
  if (percent >= 71) return 'blue';
  if (percent >= 56) return 'amber';
  return 'red';
}
