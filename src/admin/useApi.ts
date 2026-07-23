import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './auth';

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

// Module-level cache shared across components so navigating between pages that
// use the same endpoint (e.g. Resumen ↔ Invitados) is instant. We use a simple
// stale-while-revalidate strategy: show cached data immediately, then refresh
// in the background.
const cache = new Map<string, unknown>();

/** Lets callers seed/replace cached data (e.g. after a mutation). */
export function setCache<T>(url: string, data: T): void {
  cache.set(url, data);
}

/** Simple data-fetching hook for admin GET endpoints. */
export function useApi<T>(url: string): UseApiResult<T> {
  const [data, setData] = useState<T | null>(
    () => (cache.has(url) ? (cache.get(url) as T) : null),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !cache.has(url));
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;

    // Show cached data instantly; only block with a spinner on first load.
    if (cache.has(url)) {
      setData(cache.get(url) as T);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    apiFetch<T>(url)
      .then((result) => {
        cache.set(url, result);
        if (active) setData(result);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url, nonce]);

  return { data, error, loading, refetch };
}
