import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Fix pasted links like localhost:5173//test/abc */
export function UrlNormalizer({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const normalized = location.pathname.replace(/\/{2,}/g, '/');
    if (normalized !== location.pathname) {
      navigate(normalized + location.search + location.hash, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return <>{children}</>;
}
