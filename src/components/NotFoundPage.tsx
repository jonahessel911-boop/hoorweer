import { Link } from 'react-router-dom';
import { CustomerLayout } from './CustomerLayout';

export function NotFoundPage() {
  return (
    <CustomerLayout>
      <div className="error-page">
        <h1>Pagina niet gevonden</h1>
        <p>Deze link is ongeldig. Controleer of u de volledige URL heeft gekopieerd.</p>
        <Link to="/admin" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
          Naar admin
        </Link>
      </div>
    </CustomerLayout>
  );
}
