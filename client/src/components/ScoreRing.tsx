import { fmtScore, percentOf } from '../utils/format';

interface Props {
  value: number;
  max: number;
  size?: number;
  caption?: string;
}

function ringColor(percent: number) {
  if (percent >= 86) return '#10b981';
  if (percent >= 71) return '#6366f1';
  if (percent >= 56) return '#f59e0b';
  return '#f43f5e';
}

// Jami ballni aylana ko'rinishida ko'rsatadi
export default function ScoreRing({ value, max, size = 112, caption }: Props) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = percentOf(value, max);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef0f6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor(percent)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-2xl font-bold leading-none text-slate-900">{fmtScore(value)}</span>
        <span className="mt-1 text-xs text-slate-400">{caption ?? `/ ${max}`}</span>
      </div>
    </div>
  );
}
