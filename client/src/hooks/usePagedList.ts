import { useCallback, useEffect, useState } from 'react';
import { get, getErrorMessage, Params } from '../api/client';
import type { Paged } from '../types';

// Server tomonidagi qidiruv + pagination uchun umumiy hook
export function usePagedList<T>(url: string, extra: Params = {}, limit = 10) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  const extraKey = JSON.stringify(extra);

  // Qidiruv 300ms kutib yuboriladi va 1-sahifaga qaytadi
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [extraKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    get<Paged<T>>(url, { ...(JSON.parse(extraKey) as Params), page, limit, search })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setError('');
        // O'chirishdan keyin sahifa bo'sh qolsa, bitta orqaga qaytamiz
        if (data.items.length === 0 && page > 1) setPage(page - 1);
      })
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [url, extraKey, page, limit, search, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    items,
    total,
    totalPages,
    page,
    limit,
    loading,
    error,
    searchInput,
    setSearchInput,
    setPage,
    reload,
  };
}
