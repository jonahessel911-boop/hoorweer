import { useEffect, useState, useCallback } from 'react';
import { fetchOrderById, fetchLeadById, subscribeToChanges } from '../lib/db';
import type { Order, Lead } from '../lib/types';

export function useOrderDetail(orderId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!orderId) return;

    const orderRes = await fetchOrderById(orderId);
    if (orderRes.error || !orderRes.data) {
      setError(orderRes.error || 'Order niet gevonden');
      setOrder(null);
      setLead(null);
    } else {
      setOrder(orderRes.data);
      setError(null);
      const leadRes = await fetchLeadById(orderRes.data.lead_id);
      setLead(leadRes.data);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    refetch();
    if (!orderId) return;
    const unsubscribe = subscribeToChanges(refetch);
    return unsubscribe;
  }, [orderId, refetch]);

  return { order, lead, loading, error, refetch };
}
