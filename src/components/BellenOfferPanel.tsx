import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { createOrder, fetchOrdersByLeadId, updateOrder } from '../lib/db';
import { calcFinalPrice, formatEuro } from '../lib/pricing';
import { productToOrderFields } from '../lib/productUtils';
import { appUrl, copyToClipboard, formatOrderNumber } from '../lib/format';
import type { Lead, Order } from '../lib/types';

interface BellenOfferPanelProps {
  lead: Lead;
}

export function BellenOfferPanel({ lead }: BellenOfferPanelProps) {
  const { products, loading: productsLoading } = useRealtimeProducts();
  const activeProducts = products.filter((p) => p.actief);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [korting, setKorting] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const { data } = await fetchOrdersByLeadId(lead.id);
    setOrders(data || []);
    setOrdersLoading(false);
  }, [lead.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (activeProducts.length > 0 && !productId) {
      setProductId(activeProducts[0].id);
    }
  }, [activeProducts, productId]);

  const latestOrder =
    orders.find((o) => o.status === 'offerte_aangemaakt' || o.status === 'offerte_verzonden') ?? null;
  const selected = activeProducts.find((p) => p.id === productId) ?? null;
  const kortingBedrag = parseFloat(korting) || 0;
  const listprijs = selected?.listprijs ?? 0;
  const finalPrice = calcFinalPrice(listprijs, kortingBedrag);

  const copyOfferLink = (order: Order) => {
    copyToClipboard(appUrl(`/order/${order.offerte_token}`));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleSendExisting = async (order: Order) => {
    setSaving(true);
    setError(null);
    copyOfferLink(order);
    if (order.status === 'offerte_aangemaakt') {
      const { error: updateError } = await updateOrder(order.id, { status: 'offerte_verzonden' });
      if (updateError) {
        setError(updateError);
        setSaving(false);
        return;
      }
    }
    await loadOrders();
    setSaving(false);
  };

  const handleCreateAndSend = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);

    const fields = productToOrderFields(selected, kortingBedrag);
    const { data, error: createError } = await createOrder({ lead_id: lead.id, ...fields });
    if (createError || !data) {
      setError(createError || 'Kon offerte niet aanmaken.');
      setSaving(false);
      return;
    }

    copyOfferLink(data);

    const { error: updateError } = await updateOrder(data.id, { status: 'offerte_verzonden' });
    if (updateError) {
      setError(`Offerte aangemaakt, maar verzenden mislukt: ${updateError}`);
      setSaving(false);
      await loadOrders();
      return;
    }

    setKorting('0');
    await loadOrders();
    setSaving(false);
  };

  return (
    <div className="bellen-side-card card">
      <h3 className="bellen-side-title">Offerte</h3>

      {ordersLoading ? (
        <p className="crm-muted" style={{ margin: 0 }}>Orders laden…</p>
      ) : latestOrder ? (
        <div className="bellen-offer-existing">
          <p className="bellen-offer-meta">
            <strong>{formatOrderNumber(latestOrder.order_nummer)}</strong>
            <span className="crm-muted"> · {latestOrder.productnaam}</span>
          </p>
          <p className="bellen-offer-price">{formatEuro(Number(latestOrder.prijs))}</p>
          <div className="bellen-offer-actions">
            <button
              type="button"
              className="btn btn-primary btn-compact"
              onClick={() => handleSendExisting(latestOrder)}
              disabled={saving}
            >
              {saving ? 'Bezig…' : copied ? 'Link gekopieerd!' : 'Verstuur offerte'}
            </button>
            <Link to={`/admin/orders/${latestOrder.id}`} className="btn btn-secondary btn-compact">
              Bekijk
            </Link>
          </div>
          {latestOrder.status === 'offerte_verzonden' && (
            <p className="bellen-offer-sent-hint">Status: offerte verzonden</p>
          )}
        </div>
      ) : productsLoading ? (
        <p className="crm-muted" style={{ margin: 0 }}>Producten laden…</p>
      ) : activeProducts.length === 0 ? (
        <p className="crm-muted" style={{ margin: 0 }}>Geen actieve producten.</p>
      ) : (
        <>
          <div className="form-group bellen-offer-field">
            <label htmlFor="bellen-offer-product">Product</label>
            <select
              id="bellen-offer-product"
              className="form-input"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.naam} — {formatEuro(p.listprijs)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group bellen-offer-field">
            <label htmlFor="bellen-offer-korting">Korting (€)</label>
            <input
              id="bellen-offer-korting"
              type="number"
              step="0.01"
              min="0"
              max={listprijs}
              className="form-input"
              value={korting}
              onChange={(e) => setKorting(e.target.value)}
            />
          </div>

          <div className="bellen-offer-total">
            <span>Totaal</span>
            <strong>{formatEuro(finalPrice)}</strong>
          </div>

          <button
            type="button"
            className="btn btn-primary bellen-offer-send-btn"
            onClick={handleCreateAndSend}
            disabled={saving || !selected || finalPrice < 0}
          >
            {saving ? 'Bezig…' : copied ? 'Link gekopieerd!' : 'Offerte aanmaken & versturen'}
          </button>
        </>
      )}

      {error && <p className="bellen-offer-error">{error}</p>}
    </div>
  );
}
