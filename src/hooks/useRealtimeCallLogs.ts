import { useEffect, useState, useCallback } from 'react';
import { fetchAllCallLogs, subscribeToChanges } from '../lib/db';
import { useAdminData } from '../contexts/AdminDataContext';
import type { CallLog } from '../lib/types';

export function useRealtimeCallLogs() {
  const adminData = useAdminData();

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
    if (adminData) return;
    refetch();
    const unsubscribe = subscribeToChanges(refetch);
    return unsubscribe;
  }, [adminData, refetch]);

  if (adminData) {
    return {
      callLogs: adminData.callLogs,
      loading: adminData.initialLoading && adminData.callLogs.length === 0,
      error: adminData.errors.callLogs,
      refetch: adminData.refetchCallLogs,
    };
  }

  return { callLogs, loading, error, refetch };
}
