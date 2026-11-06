import { ReactNode } from 'react';

interface Props {
  label: string;
  value: number | string;
  icon: ReactNode;
  hint?: string;
  tone?: 'brand' | 'green' | 'amber' | 'rose' | 'sky';
}

const tones: Record<NonNullable<Props['tone']>, string> = {
  brand: 'from-brand-500 to-violet-500 shadow-brand/30',
  green: 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
  amber: 'from-amber-500 to-orange-500 shadow-amber-500/30',
  rose: 'from-rose-500 to-pink-500 shadow-rose-500/30',
  sky: 'from-sky-500 to-cyan-500 shadow-sky-500/30',
};

export default function StatCard({ label, value, icon, hint, tone = 'brand' }: Props) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${tones[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-500">{label}</p>
        <p className="tabular truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
