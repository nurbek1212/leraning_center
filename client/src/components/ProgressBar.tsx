import { percentOf } from '../utils/format';

interface Props {
  value: number;
  max: number;
  className?: string;
}

// Rang to'ldirilganlik foiziga qarab tanlanadi
function barColor(percent: number) {
  if (percent >= 86) return 'bg-emerald-500';
  if (percent >= 71) return 'bg-brand-500';
  if (percent >= 56) return 'bg-amber-500';
  return 'bg-rose-500';
}

export default function ProgressBar({ value, max, className = '' }: Props) {
  const percent = percentOf(value, max);
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className={`h-full rounded-full transition-all duration-500 ${barColor(percent)}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
