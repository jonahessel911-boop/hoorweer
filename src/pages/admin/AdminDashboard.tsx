import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { LeadsTab } from './tabs/LeadsTab';
import { OrdersTab } from './tabs/OrdersTab';
import { ProductsTab } from './tabs/ProductsTab';
import { BellenTab } from './tabs/BellenTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';

export function AdminDashboard() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Navigate to="leads" replace />} />
        <Route path="leads" element={<LeadsTab />} />
        <Route path="orders" element={<OrdersTab />} />
        <Route path="products" element={<ProductsTab />} />
        <Route path="bellen" element={<BellenTab />} />
        <Route path="analytics" element={<AnalyticsTab />} />
      </Routes>
    </AdminLayout>
  );
}
