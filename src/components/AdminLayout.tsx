import { type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { logoutAdmin } from '../lib/auth';

interface AdminLayoutProps {
  children: ReactNode;
}

const TABS = [
  { to: '/admin/dashboard/leads', label: 'Leads' },
  { to: '/admin/dashboard/orders', label: 'Orders' },
  { to: '/admin/dashboard/products', label: 'Producten' },
  { to: '/admin/dashboard/bellen', label: 'Bellen' },
  { to: '/admin/dashboard/analytics', label: 'Analytics' },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin');
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-left">
          <Link to="/admin/dashboard/leads">
            <Logo size="sm" />
          </Link>
          <nav className="admin-nav admin-tabs">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Uitloggen
        </button>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
