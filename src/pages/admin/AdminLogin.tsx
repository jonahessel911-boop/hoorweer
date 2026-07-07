import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin, isAdminAuthenticated } from '../../lib/auth';
import { Logo } from '../../components/Logo';

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (isAdminAuthenticated()) {
    navigate('/admin/dashboard/leads', { replace: true });
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loginAdmin(password)) {
      navigate('/admin/dashboard/leads');
    } else {
      setError('Onjuist wachtwoord');
    }
  };

  return (
    <div className="customer-layout">
      <main className="customer-main">
        <div className="customer-content">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Logo size="lg" />
          </div>
          <div className="card card-lg">
            <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.3rem' }}>
              Admin login
            </h1>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="password">Wachtwoord</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {error && (
                <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
              )}
              <button type="submit" className="btn btn-primary btn-lg" style={{ maxWidth: '100%' }}>
                Inloggen
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
