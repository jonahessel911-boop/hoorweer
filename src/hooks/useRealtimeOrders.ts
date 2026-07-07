import { useEffect, useState, useCallback } from 'react';
import { fetchOrders, subscribeToChanges } from '../lib/db';
import { useAdminData } from '../contexts/AdminDataContext';
import type { Order } from '../lib/types';

export function useRealtimeOrders() {
  const adminData = useAdminData();

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
    if (adminData) return;
    refetch();
    const unsubscribe = subscribeToChanges(refetch);
    return unsubscribe;
  }, [adminData, refetch]);

  if (adminData) {
    return {
      orders: adminData.orders,
      loading: adminData.initialLoading && adminData.orders.length === 0,
      error: adminData.errors.orders,
      refetch: adminData.refetchOrders,
    };
  }

  return { orders, loading, error, refetch };
}
