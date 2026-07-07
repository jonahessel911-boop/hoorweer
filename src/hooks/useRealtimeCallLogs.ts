import { useEffect, useState, useCallback } from 'react';
import { fetchAllCallLogs, subscribeToChanges } from '../lib/db';
import type { CallLog } from '../lib/types';

export function useRealtimeCallLogs() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error: fetchError } = await fetchAllCallLogs();
    if (fetchError) {
      setError(fetchError);
    } else {
      setCallLogs(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const unsubscribe = subscribeToChanges(refetch);
    return unsubscribe;
  }, [refetch]);

  return { callLogs, loading, error, refetch };
}
