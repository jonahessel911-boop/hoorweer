import { type ReactNode } from 'react';
import { Logo } from './Logo';
import { CustomerFooter } from './CustomerFooter';

interface CustomerLayoutProps {
  children: ReactNode;
  wide?: boolean;
}

export function CustomerLayout({ children, wide }: CustomerLayoutProps) {
  return (
    <div className="customer-layout">
      <main className={`customer-main ${wide ? 'customer-main-wide' : ''}`}>
        <div className={`customer-content ${wide ? 'customer-content-wide' : ''}`}>
          {!wide && (
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <Logo size="lg" />
            </div>
          )}
          {children}
        </div>
      </main>
      <CustomerFooter />
    </div>
  );
}
