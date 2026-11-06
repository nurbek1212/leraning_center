import { useCallback, useEffect, useState } from 'react';
import { get, getErrorMessage, Params } from '../api/client';

// Oddiy GET so'rov uchun hook (yuklanish, xato va qayta yuklash bilan)
export function useFetch<T>(url: string | null, params: Params = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    get<T>(url, JSON.parse(paramsKey) as Params)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError('');
      })
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [url, paramsKey, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, loading, error, reload, setData };
}
