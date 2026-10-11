'use client';

import { useEffect, useState } from 'react';

// Each source owns its loading and failure state, including retries.
export function useApiData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(load)
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, version]);

  const reload = () => {
    setData(null);
    setError(null);
    setLoading(true);
    setVersion(value => value + 1);
  };

  return { data, loading, error, reload };
}
