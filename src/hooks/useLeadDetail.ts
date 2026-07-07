import { useEffect, useState, useCallback } from 'react';
import {
  fetchLeadById,
  fetchOrdersByLeadId,
  fetchTestResults,
  subscribeToChanges,
} from '../lib/db';
import type { Lead, TestResult, Order } from '../lib/types';

export function useLeadDetail(leadId: string | undefined) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!leadId) return;

    const [leadRes, resultsRes, ordersRes] = await Promise.all([
      fetchLeadById(leadId),
      fetchTestResults(leadId),
      fetchOrdersByLeadId(leadId),
    ]);

    if (leadRes.error) {
      setError(leadRes.error);
    } else {
      setLead(leadRes.data);
    }
    setTestResults(resultsRes.data);
    setOrders(ordersRes.data);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    refetch();
    if (!leadId) return;

    const unsubscribe = subscribeToChanges(refetch);
    const onFocus = () => refetch();
    window.addEventListener('focus', onFocus);

    const poll = window.setInterval(refetch, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
      window.clearInterval(poll);
    };
  }, [leadId, refetch]);

  return { lead, testResults, orders, loading, error, refetch };
}
