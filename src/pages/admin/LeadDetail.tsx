import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { StatusBadge, DeliveryText } from '../../components/StatusBadge';
import { HearingTestStepsTable } from '../../components/HearingTestStepsTable';
import { HearingAiAnalysisPanel } from '../../components/HearingAiAnalysisPanel';
import { CreateOfferModal } from '../../components/CreateOfferModal';
import { useLeadDetail } from '../../hooks/useLeadDetail';
import { updateLead } from '../../lib/db';
import { canSendTestLink } from '../../lib/leadStatus';
import { formatDate, copyToClipboard, testUrlForLead, formatOrderNumber } from '../../lib/format';
import { sendTestLinkEmail } from '../../lib/emailApi';
import { downloadOfferPdf } from '../../lib/offerPdf';

type Tab = 'hoortest' | 'orders';

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lead, testResults, orders, loading, error, refetch } = useLeadDetail(id);
  const [activeTab, setActiveTab] = useState<Tab>('hoortest');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCopyTestLink = () => {
    if (!lead) return;
    copyToClipboard(testUrlForLead(lead));
    setCopiedTest(true);
    setTimeout(() => setCopiedTest(false), 2000);
  };

  const handleSendTest = async () => {
    if (!lead) return;
    const testUrl = testUrlForLead(lead);
    copyToClipboard(testUrl);
    setCopiedTest(true);
    setTimeout(() => setCopiedTest(false), 2000);

    if (lead.email) {
      const emailRes = await sendTestLinkEmail({
        to: lead.email,
        naam: lead.naam,
        testUrl,
      });
      if (!emailRes.ok) {
        setFeedback(`Link gekopieerd, maar e-mail mislukt: ${emailRes.error}`);
        setTimeout(() => setFeedback(null), 6000);
      }
    }

    const { error: updateError } = await updateLead(lead.id, { status: 'test_verzonden' });
    if (updateError) {
      setFeedback(`Testlink gekopieerd, maar status kon niet worden bijgewerkt: ${updateError}`);
      setTimeout(() => setFeedback(null), 6000);
    }
    refetch();
  };

  if (loading) {
    return (
      <AdminLayout>
        <p>Laden...</p>
      </AdminLayout>
    );
  }

  if (error || !lead) {
    return (
      <AdminLayout>
        <p style={{ color: 'var(--danger)' }}>{error || 'Lead niet gevonden'}</p>
        <Link to="/admin/dashboard/leads" className="back-link">← Terug naar leads</Link>
      </AdminLayout>
    );
  }

  const initials = lead.naam
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const showSendTest = canSendTestLink(lead) && lead.status !== 'test_verzonden';

  return (
    <AdminLayout>
      <div className="lead-detail-page">
        <div className="lead-detail-topbar">
          <Link to="/admin/dashboard/leads" className="back-link">← Terug naar leads</Link>
          <div className="lead-detail-actions-top">
            <button type="button" className="btn btn-secondary btn-compact" onClick={handleCopyTestLink}>
              {copiedTest ? 'Gekopieerd!' : 'Kopieer testlink'}
            </button>
            {showSendTest && (
              <button type="button" className="btn btn-primary btn-compact" onClick={handleSendTest}>
                {copiedTest ? 'Link gekopieerd!' : 'Verzend testlink'}
              </button>
            )}
            <button type="button" className="btn btn-primary btn-compact" onClick={() => setOrderModalOpen(true)}>
              Offerte aanmaken
            </button>
          </div>
        </div>

        {feedback && (
          <div className="info-banner" style={{ marginBottom: 16 }}>{feedback}</div>
        )}

        <div className="lead-profile-card">
          <div className="lead-profile-header">
            <div className="lead-avatar">{initials}</div>
            <div className="lead-profile-info">
              <h1 className="lead-profile-name">{lead.naam}</h1>
              <p className="lead-profile-meta">
                <StatusBadge
                  status={lead.status}
                  lead={lead.contact_uitkomst ? lead : undefined}
                />
              </p>
            </div>
          </div>

          <div className="lead-info-bar">
            <div className="lead-info-item">
              <span className="lead-info-label">Telefoon</span>
              <span className="lead-info-value">{lead.telefoon}</span>
            </div>
            <div className="lead-info-item">
              <span className="lead-info-label">E-mail</span>
              <span className="lead-info-value">{lead.email || '—'}</span>
            </div>
            <div className="lead-info-item">
              <span className="lead-info-label">Aangemaakt</span>
              <span className="lead-info-value">{formatDate(lead.created_at)}</span>
            </div>
            <div className="lead-info-item">
              <span className="lead-info-label">Testlink</span>
              <span className="lead-info-value">
                <a
                  href={testUrlForLead(lead)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}
                >
                  {testUrlForLead(lead)}
                </a>
              </span>
            </div>
          </div>
        </div>

        <div className="lead-detail-tabs">
          <button
            type="button"
            className={`lead-tab ${activeTab === 'hoortest' ? 'lead-tab-active' : ''}`}
            onClick={() => setActiveTab('hoortest')}
          >
            Hoortest
          </button>
          <button
            type="button"
            className={`lead-tab ${activeTab === 'orders' ? 'lead-tab-active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders ({orders.length})
          </button>
        </div>

        <div className="lead-detail-body">
          {activeTab === 'hoortest' && (
            <>
              <HearingAiAnalysisPanel lead={lead} testResults={testResults} />
              <HearingTestStepsTable testResults={testResults} leadStatus={lead.status} />
            </>
          )}

          {activeTab === 'orders' && (
            <>
              {orders.length > 0 ? (
                <div className="crm-panel">
                  <div className="crm-table-wrap">
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Product</th>
                          <th>Prijs</th>
                          <th>Offerte</th>
                          <th>Levering</th>
                          <th>PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr
                            key={order.id}
                            className="crm-row-clickable"
                            onClick={() => navigate(`/admin/orders/${order.id}`)}
                          >
                            <td className="crm-link crm-num">{formatOrderNumber(order.order_nummer)}</td>
                            <td className="crm-link">{order.productnaam}</td>
                            <td className="crm-num">€ {Number(order.prijs).toFixed(2)}</td>
                            <td><StatusBadge status={order.status} /></td>
                            <td><DeliveryText status={order.delivery_status} /></td>
                            <td onClick={(e) => e.stopPropagation()}>
                              {order.signed_offer_pdf ? (
                                <button
                                  type="button"
                                  className="crm-text-action"
                                  onClick={() =>
                                    downloadOfferPdf(
                                      order.signed_offer_pdf!,
                                      `HearDirect-offerte-${order.order_nummer || order.id.slice(0, 8)}.pdf`
                                    )
                                  }
                                >
                                  Download
                                </button>
                              ) : (
                                <span className="crm-muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="crm-panel" style={{ padding: 24 }}>
                  <p className="crm-muted" style={{ margin: 0 }}>Nog geen orders.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateOfferModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        leadId={lead.id}
        onCreated={refetch}
      />
    </AdminLayout>
  );
}
