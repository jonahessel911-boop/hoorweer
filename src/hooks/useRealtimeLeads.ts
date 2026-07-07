import { useEffect, useState, useCallback } from 'react';
import { fetchLeads, subscribeToChanges } from '../lib/db';
import { useAdminData } from '../contexts/AdminDataContext';
import type { Lead } from '../lib/types';

export function useRealtimeLeads() {
  const adminData = useAdminData();

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
    if (adminData) return;
    refetch();
    const unsubscribe = subscribeToChanges(refetch);
    return unsubscribe;
  }, [adminData, refetch]);

  if (adminData) {
    return {
      leads: adminData.leads,
      loading: adminData.initialLoading && adminData.leads.length === 0,
      error: adminData.errors.leads,
      refetch: adminData.refetchLeads,
    };
  }

  return { leads, loading, error, refetch };
}
