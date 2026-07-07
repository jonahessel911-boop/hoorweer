import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchAllCallLogs,
  fetchLeads,
  fetchOrders,
  fetchProducts,
  subscribeToChanges,
} from '../lib/db';
import type { CallLog, Lead, Order, Product } from '../lib/types';

interface AdminDataErrors {
  leads: string | null;
  orders: string | null;
  products: string | null;
  callLogs: string | null;
}

interface AdminDataContextValue {
  leads: Lead[];
  orders: Order[];
  products: Product[];
  callLogs: CallLog[];
  initialLoading: boolean;
  errors: AdminDataErrors;
  refetchLeads: () => Promise<void>;
  refetchOrders: () => Promise<void>;
  refetchProducts: () => Promise<void>;
  refetchCallLogs: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<AdminDataErrors>({
    leads: null,
    orders: null,
    products: null,
    callLogs: null,
  });
  const hasLoaded = useRef(false);

  const refetchLeads = useCallback(async () => {
    const { data, error } = await fetchLeads();
    if (error) {
      setErrors((prev) => ({ ...prev, leads: error }));
    } else {
      setLeads(data || []);
      setErrors((prev) => ({ ...prev, leads: null }));
    }
  }, []);

  const refetchOrders = useCallback(async () => {
    const { data, error } = await fetchOrders();
    if (error) {
      setErrors((prev) => ({ ...prev, orders: error }));
    } else {
      setOrders(data || []);
      setErrors((prev) => ({ ...prev, orders: null }));
    }
  }, []);

  const refetchProducts = useCallback(async () => {
    const { data, error } = await fetchProducts();
    if (error) {
      setErrors((prev) => ({ ...prev, products: error }));
    } else {
      setProducts(data || []);
      setErrors((prev) => ({ ...prev, products: null }));
    }
  }, []);

  const refetchCallLogs = useCallback(async () => {
    const { data, error } = await fetchAllCallLogs();
    if (error) {
      setErrors((prev) => ({ ...prev, callLogs: error }));
    } else {
      setCallLogs(data || []);
      setErrors((prev) => ({ ...prev, callLogs: null }));
    }
  }, []);

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchLeads(), refetchOrders(), refetchProducts(), refetchCallLogs()]);
    hasLoaded.current = true;
    setInitialLoading(false);
  }, [refetchLeads, refetchOrders, refetchProducts, refetchCallLogs]);

  useEffect(() => {
    void refetchAll();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const onChange = () => {
      if (!hasLoaded.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void Promise.all([refetchLeads(), refetchOrders(), refetchProducts(), refetchCallLogs()]);
      }, 250);
    };

    const unsubscribe = subscribeToChanges(onChange);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [refetchAll, refetchLeads, refetchOrders, refetchProducts, refetchCallLogs]);

  const value = useMemo(
    () => ({
      leads,
      orders,
      products,
      callLogs,
      initialLoading,
      errors,
      refetchLeads,
      refetchOrders,
      refetchProducts,
      refetchCallLogs,
    }),
    [
      leads,
      orders,
      products,
      callLogs,
      initialLoading,
      errors,
      refetchLeads,
      refetchOrders,
      refetchProducts,
      refetchCallLogs,
    ]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminDataContextValue | null {
  return useContext(AdminDataContext);
}
