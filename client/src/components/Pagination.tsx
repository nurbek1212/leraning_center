import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

// Joriy sahifa atrofidagi sahifa raqamlari (maksimum 5 ta)
function pageNumbers(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const nums: number[] = [];
  for (let i = start; i <= end; i++) nums.push(i);
  return nums;
}

export default function Pagination({ page, totalPages, total, limit, onChange }: Props) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        {from}–{to} / {total}
      </p>
      <div className="flex items-center gap-1">
        <button className="icon-btn disabled:opacity-40" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={18} />
        </button>
        {pageNumbers(page, totalPages).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`h-8 min-w-8 rounded-lg px-2 text-sm transition ${
              n === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          className="icon-btn disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
