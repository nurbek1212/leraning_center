import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS } from '../utils/format';

interface Props {
  value: string; // 'YYYY-MM'
  onChange: (period: string) => void;
}

const toPeriod = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

// Oy tanlash: <input type="month"> Firefox'da ishlamaydi, shuning uchun oy va yil alohida tanlanadi
export default function PeriodPicker({ value, onChange }: Props) {
  const [y, m] = value.split('-').map(Number);
  const thisYear = new Date().getFullYear();
  const from = Math.min(y, thisYear) - 2;
  const to = Math.max(y, thisYear) + 1;
  const years: number[] = [];
  for (let i = from; i <= to; i++) years.push(i);

  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    onChange(toPeriod(d.getFullYear(), d.getMonth() + 1));
  };

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className="btn-secondary !px-2.5" onClick={() => shift(-1)} aria-label="Oldingi oy">
        <ChevronLeft size={16} />
      </button>
      <select className="input !w-auto" value={m} onChange={(e) => onChange(toPeriod(y, Number(e.target.value)))} aria-label="Oy">
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select className="input !w-auto" value={y} onChange={(e) => onChange(toPeriod(Number(e.target.value), m))} aria-label="Yil">
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <button type="button" className="btn-secondary !px-2.5" onClick={() => shift(1)} aria-label="Keyingi oy">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
