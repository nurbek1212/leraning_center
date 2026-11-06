import { ReactNode, useEffect, useMemo, useState } from 'react';
import DataTable, { Column } from './DataTable';
import Pagination from './Pagination';
import SearchInput from './SearchInput';

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  searchText: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
  pageSize?: number;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
}

// Ma'lumot to'liq yuklangan ro'yxatlar uchun: qidiruv va pagination brauzerda ishlaydi
export default function ClientTable<T>({
  columns,
  rows,
  rowKey,
  searchText,
  loading,
  emptyText,
  pageSize = 10,
  searchPlaceholder,
  toolbar,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows;
  }, [rows, search, searchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
        />
        {toolbar}
      </div>
      <DataTable columns={columns} rows={visible} rowKey={rowKey} loading={loading} emptyText={emptyText} />
      <Pagination page={page} totalPages={totalPages} total={filtered.length} limit={pageSize} onChange={setPage} />
    </div>
  );
}
