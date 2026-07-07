import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '../lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
