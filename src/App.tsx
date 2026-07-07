import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { LeadDetail } from './pages/admin/LeadDetail';
import { OrderDetail } from './pages/admin/OrderDetail';
import { TestFlow } from './pages/test/TestFlow';
import { OrderPage } from './pages/order/OrderPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UrlNormalizer } from './components/UrlNormalizer';
import { NotFoundPage } from './components/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <UrlNormalizer>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard/*"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leads/:id"
            element={
              <ProtectedRoute>
                <LeadDetail />
              </ProtectedRoute>
            }
          />
          <Route
          path="/admin/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route path="/test/:token" element={<TestFlow />} />
          <Route path="/order/:token" element={<OrderPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </UrlNormalizer>
    </BrowserRouter>
  );
}

export default App;
