import { ReactNode } from 'react';
import Spinner from './Spinner';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyText?: string;
}

// Faqat jadvalning o'zi (qidiruv va pagination tashqarida boshqariladi)
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyText = "Ma'lumot topilmadi",
}: Props<T>) {
  if (loading) return <Spinner />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="border-y border-slate-100 bg-slate-50/80">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={`th ${c.className || ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="transition hover:bg-slate-50/70">
                {columns.map((c) => (
                  <td key={c.header} className={`td ${c.className || ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
