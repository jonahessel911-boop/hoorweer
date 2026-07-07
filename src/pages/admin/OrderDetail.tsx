import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { StatusBadge, DeliveryText } from '../../components/StatusBadge';
import { OrderTimeline } from '../../components/OrderTimeline';
import { useOrderDetail } from '../../hooks/useOrderDetail';
import { updateOrder } from '../../lib/db';
import { formatDate, copyToClipboard, appUrl, formatOrderNumber } from '../../lib/format';
import { getDeliveryLabel, getAdvanceDeliveryUpdates, getNextDeliveryStatus } from '../../lib/orderTimeline';
import { downloadOfferPdf } from '../../lib/offerPdf';
import { formatEuro } from '../../lib/pricing';
import { sendOfferEmail, sendPaymentLinkEmail } from '../../lib/emailApi';
import { PLACEHOLDER_PRODUCT_IMAGE } from '../../lib/productUtils';

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { order, lead, loading, error, refetch } = useOrderDetail(id);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleCopyLink = () => {
    if (!order) return;
    copyToClipboard(appUrl(`/order/${order.offerte_token}`));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendOffer = async () => {
    if (!order || !lead) return;
    setBusy(true);
    const offerUrl = appUrl(`/order/${order.offerte_token}`);
    if (lead.email) {
      const emailRes = await sendOfferEmail({
        to: lead.email,
        naam: lead.naam,
        productnaam: order.productnaam,
        prijsFormatted: formatEuro(Number(order.prijs)),
        offerUrl,
      });
      if (!emailRes.ok) {
        setBusy(false);
        return;
      }
    }
    await updateOrder(order.id, { status: 'offerte_verzonden' });
    await refetch();
    setBusy(false);
  };

  const handleSendPaymentLink = async () => {
    if (!order || !lead) return;
    setBusy(true);
    const paymentUrl = appUrl(`/order/${order.offerte_token}`);
    if (lead.email) {
      const emailRes = await sendPaymentLinkEmail({
        to: lead.email,
        naam: lead.naam,
        productnaam: order.productnaam,
        prijsFormatted: formatEuro(Number(order.prijs)),
        paymentUrl,
      });
      if (!emailRes.ok) {
        setBusy(false);
        return;
      }
    }
    await updateOrder(order.id, { status: 'betaallink_verzonden' });
    await refetch();
    setBusy(false);
  };

  const handleAdvanceDelivery = async () => {
    if (!order) return;
    const updates = getAdvanceDeliveryUpdates(order);
    if (!updates) return;
    setBusy(true);
    await updateOrder(order.id, updates);
    await refetch();
    setBusy(false);
  };

  const handleNettoSale = async () => {
    if (!order) return;
    setBusy(true);
    await updateOrder(order.id, {
      delivery_status: 'netto_sale',
      netto_sale_op: new Date().toISOString(),
    });
    await refetch();
    setBusy(false);
  };

  const handleCancel = async () => {
    if (!order || !confirm('Weet u zeker dat u deze order wilt annuleren?')) return;
    setBusy(true);
    await updateOrder(order.id, {
      delivery_status: 'cancelled',
      cancelled_op: new Date().toISOString(),
      cancelled_from: order.delivery_status,
    });
    await refetch();
    setBusy(false);
  };

  if (loading) {
    return (
      <AdminLayout>
        <p>Laden...</p>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <p style={{ color: 'var(--danger)' }}>{error || 'Order niet gevonden'}</p>
        <Link to="/admin/dashboard/orders" className="back-link">← Terug naar orders</Link>
      </AdminLayout>
    );
  }

  const canAdvance =
    order.delivery_status !== 'cancelled' &&
    order.delivery_status !== 'netto_sale' &&
    getNextDeliveryStatus(order.delivery_status) !== null;

  const canMarkNetto = order.delivery_status === 'bedenktijd';
  const canCancel = order.delivery_status !== 'cancelled' && order.delivery_status !== 'netto_sale';
  const isOfferte = order.delivery_status === 'offerte';
  const imageUrl = order.product_image_url || PLACEHOLDER_PRODUCT_IMAGE;
  const hasDiscount = order.korting_bedrag > 0;

  return (
    <AdminLayout>
      <div className="order-detail-page">
        <div className="order-detail-topbar">
          <Link to="/admin/dashboard/orders" className="back-link">← Terug naar orders</Link>
          <div className="order-detail-actions">
            {canAdvance && (
              <button type="button" className="btn btn-primary btn-compact" onClick={handleAdvanceDelivery} disabled={busy}>
                Volgende stap
              </button>
            )}
            {canMarkNetto && (
              <button type="button" className="btn btn-success btn-compact" onClick={handleNettoSale} disabled={busy}>
                Markeer netto sale
              </button>
            )}
            {canCancel && (
              <button type="button" className="btn btn-danger-outline btn-compact" onClick={handleCancel} disabled={busy}>
                Annuleren
              </button>
            )}
          </div>
        </div>

        <div className="order-profile-card">
          <div className="order-profile-main">
            <img src={imageUrl} alt="" className="order-profile-image" />
            <div className="order-profile-info">
              <p className="order-profile-id">
                {order.order_nummer ? formatOrderNumber(order.order_nummer) : 'Offerte'}
              </p>
              <h1 className="order-profile-title">{order.productnaam}</h1>
              {order.product_model && (
                <p className="order-profile-model">Model {order.product_model}</p>
              )}
              <div className="order-profile-badges">
                <StatusBadge status={order.status} />
                <DeliveryText status={order.delivery_status} />
              </div>
            </div>
            <div className="order-profile-price">
              {hasDiscount && (
                <span className="order-price-was">{formatEuro(order.listprijs)}</span>
              )}
              <span className="order-price-now">{formatEuro(order.prijs)}</span>
              {hasDiscount && (
                <span className="order-price-discount">−{formatEuro(order.korting_bedrag)} korting</span>
              )}
            </div>
          </div>

          <div className="order-info-bar">
            <div className="order-info-item">
              <span className="order-info-label">Klant</span>
              <span className="order-info-value">
                {lead ? <Link to={`/admin/leads/${lead.id}`}>{lead.naam}</Link> : '—'}
              </span>
            </div>
            <div className="order-info-item">
              <span className="order-info-label">Telefoon</span>
              <span className="order-info-value">{lead?.telefoon || '—'}</span>
            </div>
            <div className="order-info-item">
              <span className="order-info-label">Land</span>
              <span className="order-info-value">{order.land}</span>
            </div>
            <div className="order-info-item">
              <span className="order-info-label">Aangemaakt</span>
              <span className="order-info-value">{formatDate(order.created_at)}</span>
            </div>
            <div className="order-info-item">
              <span className="order-info-label">Offertelink</span>
              <span className="order-info-value order-link-actions">
                <a
                  href={appUrl(`/order/${order.offerte_token}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="crm-text-action"
                >
                  Open offerte
                </a>
                <button type="button" className="crm-text-action" onClick={handleCopyLink}>
                  {copied ? 'Gekopieerd!' : 'Kopieer link'}
                </button>
              </span>
            </div>
          </div>
        </div>

        {isOfferte && (
          <div className="info-banner order-offerte-hint">
            De order wordt automatisch aangemaakt zodra de klant de offerte ondertekent.
          </div>
        )}

        <div className="order-detail-sections">
          <div className="crm-panel order-detail-panel">
            <h2 className="crm-section-title">Gegevens</h2>
            <dl className="detail-list detail-list-grid">
              {order.order_nummer && (
                <div><dt>Ordernummer</dt><dd>{formatOrderNumber(order.order_nummer)}</dd></div>
              )}
              {order.straat && (
                <div>
                  <dt>Adres</dt>
                  <dd>
                    {order.straat} {order.huisnummer}{order.huisnummer_toevoeging || ''}
                    <br />
                    {order.postcode} {order.plaats}
                    {order.provincie ? `, ${order.provincie}` : ''}
                  </dd>
                </div>
              )}
              {order.ondertekend_op && (
                <div><dt>Ondertekend</dt><dd>{formatDate(order.ondertekend_op)}</dd></div>
              )}
              {order.ondertekend_door && (
                <div><dt>Ondertekend door</dt><dd>{order.ondertekend_door}</dd></div>
              )}
              <div>
                <dt>Offertelink</dt>
                <dd className="order-link-mono">/order/{order.offerte_token.slice(0, 12)}…</dd>
              </div>
            </dl>

            <div className="order-detail-quick-actions">
              {order.signed_offer_pdf && (
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  onClick={() =>
                    downloadOfferPdf(
                      order.signed_offer_pdf!,
                      `HearDirect-offerte-${order.order_nummer || order.id.slice(0, 8)}.pdf`
                    )
                  }
                >
                  Download PDF
                </button>
              )}
              {order.status === 'offerte_aangemaakt' && (
                <button type="button" className="btn btn-secondary btn-compact" onClick={handleSendOffer} disabled={busy}>
                  Markeer offerte verzonden
                </button>
              )}
              {order.status === 'ondertekend' && (
                <button type="button" className="btn btn-primary btn-compact" onClick={handleSendPaymentLink} disabled={busy}>
                  Verstuur betaallink
                </button>
              )}
            </div>
          </div>

          {!isOfferte && (
            <div className="crm-panel order-detail-panel">
              <h2 className="crm-section-title">Leveringsstatus</h2>
              <p className="crm-muted timeline-subtitle">
                Huidige status: {getDeliveryLabel(order.delivery_status)}
              </p>
              <OrderTimeline order={order} />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
