import { useEffect, useState, useCallback } from 'react';
import { fetchProducts, subscribeToChanges } from '../lib/db';
import type { Product } from '../lib/types';

export function useRealtimeProducts() {
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
    refetch();
    const unsubscribe = subscribeToChanges(refetch);
    return unsubscribe;
  }, [refetch]);

  return { products, loading, error, refetch };
}
