import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { AdminDataProvider } from '../../contexts/AdminDataContext';
import { LeadsTab } from './tabs/LeadsTab';
import { OrdersTab } from './tabs/OrdersTab';
import { ProductsTab } from './tabs/ProductsTab';
import { BellenTab } from './tabs/BellenTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';

const DASHBOARD_TABS = [
  { id: 'leads', element: <LeadsTab /> },
  { id: 'orders', element: <OrdersTab /> },
  { id: 'products', element: <ProductsTab /> },
  { id: 'bellen', element: <BellenTab /> },
  { id: 'analytics', element: <AnalyticsTab /> },
] as const;

type DashboardTabId = (typeof DASHBOARD_TABS)[number]['id'];

function getActiveTab(pathname: string): DashboardTabId | null {
  const match = pathname.match(/\/admin\/dashboard\/?([^/]*)/);
  const segment = match?.[1] ?? '';
  if (!segment) return null;
  return DASHBOARD_TABS.some((tab) => tab.id === segment) ? (segment as DashboardTabId) : null;
}

export function AdminDashboard() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);
  const [mountedTabs, setMountedTabs] = useState<Set<DashboardTabId>>(() => new Set(['leads']));

  useEffect(() => {
    if (activeTab) {
      setMountedTabs((prev) => {
        if (prev.has(activeTab)) return prev;
        const next = new Set(prev);
        next.add(activeTab);
        return next;
      });
    }
  }, [activeTab]);

  const resolvedTab = activeTab ?? 'leads';

  if (location.pathname.endsWith('/dashboard') || location.pathname.endsWith('/dashboard/')) {
    return <Navigate to="leads" replace />;
  }

  if (activeTab === null && !location.pathname.endsWith('/dashboard')) {
    return <Navigate to="/admin/dashboard/leads" replace />;
  }

  return (
    <AdminLayout>
      <AdminDataProvider>
        {DASHBOARD_TABS.map((tab) => {
          if (!mountedTabs.has(tab.id)) return null;
          return (
            <div key={tab.id} hidden={resolvedTab !== tab.id} aria-hidden={resolvedTab !== tab.id}>
              {tab.element}
            </div>
          );
        })}
      </AdminDataProvider>
    </AdminLayout>
  );
}
