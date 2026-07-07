import { useEffect, useState, useCallback } from 'react';
import { fetchOrders, subscribeToChanges } from '../lib/db';
import type { Order } from '../lib/types';

export function useRealtimeOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error: fetchError } = await fetchOrders();
    if (fetchError) {
      setError(fetchError);
    } else {
      setOrders(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const unsubscribe = subscribeToChanges(refetch);
    return unsubscribe;
  }, [refetch]);

  return { orders, loading, error, refetch };
}
