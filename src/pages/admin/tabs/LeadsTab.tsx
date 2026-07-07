import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../components/Modal';
import { StatusText } from '../../../components/StatusBadge';
import { getHearingTestLabel } from '../../../components/LeadStatusPipeline';
import { useRealtimeLeads } from '../../../hooks/useRealtimeLeads';
import { createLead } from '../../../lib/db';
import { formatShortDate, testUrlForLead, copyToClipboard } from '../../../lib/format';

export function LeadsTab() {
  const navigate = useNavigate();
  const { leads, loading, error, refetch } = useRealtimeLeads();
  const [modalOpen, setModalOpen] = useState(false);
  const [naam, setNaam] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ naam: '', telefoon: '', email: '', status: '' });

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (filters.naam && !lead.naam.toLowerCase().includes(filters.naam.toLowerCase())) return false;
      if (filters.telefoon && !lead.telefoon.includes(filters.telefoon)) return false;
      if (filters.email && !(lead.email || '').toLowerCase().includes(filters.email.toLowerCase())) return false;
      if (filters.status && !lead.status.includes(filters.status.toLowerCase().replace(/\s/g, '_'))) return false;
      return true;
    });
  }, [leads, filters]);

  const handleCreate = async () => {
    if (!naam.trim() || !telefoon.trim()) return;
    setSaving(true);
    setCreateError(null);

    const { data, error: insertError } = await createLead({
      naam: naam.trim(),
      telefoon: telefoon.trim(),
      email: email.trim() || null,
    });

    setSaving(false);

    if (insertError || !data) {
      setCreateError(insertError || 'Kon lead niet aanmaken. Controleer je Supabase-verbinding.');
      return;
    }

    setModalOpen(false);
    setNaam('');
    setTelefoon('');
    setEmail('');
    copyToClipboard(testUrlForLead(data));
    await refetch();
    navigate(`/admin/leads/${data.id}`);
  };

  return (
    <>
      <div className="crm-toolbar">
        <div className="crm-toolbar-left">
          <h1 className="crm-title">Leads</h1>
          <span className="crm-count">{filtered.length} van {leads.length}</span>
        </div>
        <button className="btn btn-primary btn-compact" onClick={() => { setCreateError(null); setModalOpen(true); }}>
          + Nieuwe testlink
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <p>Kon leads niet laden. Probeer de pagina te vernieuwen.</p>
        </div>
      )}

      {loading ? (
        <p className="crm-loading">Laden...</p>
      ) : (
        <div className="crm-panel">
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Telefoon</th>
                  <th>E-mail</th>
                  <th>Status</th>
                  <th>Hoortest</th>
                  <th>Aangemaakt</th>
                </tr>
                <tr className="crm-filter-row">
                  <th>
                    <input
                      className="crm-filter-input"
                      placeholder="Zoeken..."
                      value={filters.naam}
                      onChange={(e) => setFilters({ ...filters, naam: e.target.value })}
                    />
                  </th>
                  <th>
                    <input
                      className="crm-filter-input"
                      placeholder="Zoeken..."
                      value={filters.telefoon}
                      onChange={(e) => setFilters({ ...filters, telefoon: e.target.value })}
                    />
                  </th>
                  <th>
                    <input
                      className="crm-filter-input"
                      placeholder="Zoeken..."
                      value={filters.email}
                      onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                    />
                  </th>
                  <th>
                    <input
                      className="crm-filter-input"
                      placeholder="Zoeken..."
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    />
                  </th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="crm-row-clickable">
                    <td
                      className="crm-link"
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    >
                      {lead.naam}
                    </td>
                    <td onClick={() => navigate(`/admin/leads/${lead.id}`)}>{lead.telefoon}</td>
                    <td className="crm-muted" onClick={() => navigate(`/admin/leads/${lead.id}`)}>
                      {lead.email || '—'}
                    </td>
                    <td onClick={() => navigate(`/admin/leads/${lead.id}`)}>
                      <StatusText status={lead.status} lead={lead} />
                    </td>
                    <td onClick={() => navigate(`/admin/leads/${lead.id}`)}>
                      <span
                        className={`hearing-status-badge ${
                          lead.status === 'test_afgerond'
                            ? 'hearing-status-afgerond'
                            : lead.status === 'test_gestart'
                              ? 'hearing-status-gestart'
                              : lead.status === 'test_verzonden'
                                ? 'hearing-status-verzonden'
                                : 'hearing-status-niet-gestart'
                        }`}
                      >
                        {getHearingTestLabel(lead)}
                      </span>
                    </td>
                    <td className="crm-muted" onClick={() => navigate(`/admin/leads/${lead.id}`)}>
                      {formatShortDate(lead.created_at)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !error && (
                  <tr>
                    <td colSpan={6} className="crm-empty">
                      Geen leads gevonden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nieuwe testlink aanmaken">
        <div className="form-group">
          <label htmlFor="naam">Naam</label>
          <input
            id="naam"
            className="form-input"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="telefoon">Telefoon</label>
          <input
            id="telefoon"
            className="form-input"
            value={telefoon}
            onChange={(e) => setTelefoon(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">E-mail (optioneel)</label>
          <input
            id="email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {createError && (
          <p className="error-banner" style={{ marginBottom: 16, padding: '8px 12px' }}>{createError}</p>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
            Annuleren
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={saving || !naam.trim() || !telefoon.trim()}
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </Modal>
    </>
  );
}
