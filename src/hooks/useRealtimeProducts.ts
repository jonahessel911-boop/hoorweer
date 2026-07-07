import { useEffect, useState, useCallback } from 'react';
import { fetchProducts, subscribeToChanges } from '../lib/db';
import { useAdminData } from '../contexts/AdminDataContext';
import type { Product } from '../lib/types';

export function useRealtimeProducts() {
  const adminData = useAdminData();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error: fetchError } = await fetchProducts();
    if (fetchError) {
      setError(fetchError);
    } else {
      setProducts(data || []);
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
      products: adminData.products,
      loading: adminData.initialLoading && adminData.products.length === 0,
      error: adminData.errors.products,
      refetch: adminData.refetchProducts,
    };
  }

  return { products, loading, error, refetch };
}
