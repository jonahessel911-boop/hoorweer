import { useEffect, useState, useCallback } from 'react';
import { fetchLeads, subscribeToChanges } from '../lib/db';
import type { Lead } from '../lib/types';

export function useRealtimeLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error: fetchError } = await fetchLeads();
    if (fetchError) {
      setError(fetchError);
    } else {
      setLeads(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const unsubscribe = subscribeToChanges(refetch);
    return unsubscribe;
  }, [refetch]);

  return { leads, loading, error, refetch };
}
