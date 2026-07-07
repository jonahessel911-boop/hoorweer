import { useState, useMemo, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateOfferModal } from '../../../components/CreateOfferModal';
import { StatusText, DeliveryText } from '../../../components/StatusBadge';
import { useRealtimeOrders } from '../../../hooks/useRealtimeOrders';
import { useRealtimeLeads } from '../../../hooks/useRealtimeLeads';
import { formatShortDate, formatOrderNumber, orderMatchesSearch } from '../../../lib/format';

export function OrdersTab() {
  const navigate = useNavigate();
  const { orders, loading, error, refetch } = useRealtimeOrders();
  const { leads } = useRealtimeLeads();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ klant: '', product: '', status: '', levering: '', land: '' });

  const filtered = useMemo(() => {
    const leadMap = new Map(leads.map((l) => [l.id, l]));
    return orders.filter((order) => {
      const lead = leadMap.get(order.lead_id);
      const klantNaam = lead?.naam || '';
      if (!orderMatchesSearch(order, klantNaam, search)) return false;
      if (filters.klant && !klantNaam.toLowerCase().includes(filters.klant.toLowerCase())) return false;
      if (filters.product && !order.productnaam.toLowerCase().includes(filters.product.toLowerCase())) return false;
      if (filters.status && !order.status.includes(filters.status.toLowerCase().replace(/\s/g, '_'))) return false;
      if (filters.levering && !order.delivery_status.includes(filters.levering.toLowerCase().replace(/\s/g, '_'))) return false;
      if (filters.land && !order.land.toLowerCase().includes(filters.land.toLowerCase())) return false;
      return true;
    });
  }, [orders, leads, filters, search]);

  const goToOrder = (orderId: string) => navigate(`/admin/orders/${orderId}`);
  const goToLead = (e: MouseEvent, leadId: string) => {
    e.stopPropagation();
    navigate(`/admin/leads/${leadId}`);
  };

  return (
    <>
      <div className="crm-toolbar">
        <div className="crm-toolbar-left">
          <h1 className="crm-title">Orders</h1>
          <span className="crm-count">{filtered.length} van {orders.length}</span>
        </div>
        <button type="button" className="btn btn-primary btn-compact" onClick={() => setModalOpen(true)}>
          + Nieuwe offerte
        </button>
      </div>

      <div className="crm-search-bar">
        <input
          className="crm-search-input"
          placeholder="Zoek op ordernummer, klant, product of land..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-banner">
          <p>Kon orders niet laden. Probeer de pagina te vernieuwen.</p>
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
                  <th>Order</th>
                  <th>Klant</th>
                  <th>Land</th>
                  <th>Product</th>
                  <th>Prijs</th>
                  <th>Offerte</th>
                  <th>Levering</th>
                  <th>Aangemaakt</th>
                </tr>
                <tr className="crm-filter-row">
                  <th />
                  <th>
                    <input className="crm-filter-input" placeholder="Zoeken..." value={filters.klant} onChange={(e) => setFilters({ ...filters, klant: e.target.value })} />
                  </th>
                  <th>
                    <input className="crm-filter-input" placeholder="Zoeken..." value={filters.land} onChange={(e) => setFilters({ ...filters, land: e.target.value })} />
                  </th>
                  <th>
                    <input className="crm-filter-input" placeholder="Zoeken..." value={filters.product} onChange={(e) => setFilters({ ...filters, product: e.target.value })} />
                  </th>
                  <th />
                  <th>
                    <input className="crm-filter-input" placeholder="Zoeken..." value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} />
                  </th>
                  <th>
                    <input className="crm-filter-input" placeholder="Zoeken..." value={filters.levering} onChange={(e) => setFilters({ ...filters, levering: e.target.value })} />
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const lead = leads.find((l) => l.id === order.lead_id);
                  return (
                    <tr key={order.id} className="crm-row-clickable">
                      <td className="crm-link crm-num" onClick={() => goToOrder(order.id)}>
                        {formatOrderNumber(order.order_nummer)}
                      </td>
                      <td className="crm-link" onClick={(e) => lead && goToLead(e, lead.id)}>
                        {lead?.naam || '—'}
                      </td>
                      <td onClick={() => goToOrder(order.id)}>{order.land}</td>
                      <td onClick={() => goToOrder(order.id)}>{order.productnaam}</td>
                      <td className="crm-num" onClick={() => goToOrder(order.id)}>
                        € {Number(order.prijs).toFixed(2)}
                        {order.korting_bedrag > 0 && (
                          <span className="crm-muted" style={{ fontSize: '0.75rem', display: 'block' }}>
                            −€{order.korting_bedrag.toFixed(0)} korting
                          </span>
                        )}
                      </td>
                      <td onClick={() => goToOrder(order.id)}>
                        <StatusText status={order.status} />
                      </td>
                      <td onClick={() => goToOrder(order.id)}>
                        <DeliveryText status={order.delivery_status} />
                      </td>
                      <td className="crm-muted" onClick={() => goToOrder(order.id)}>
                        {formatShortDate(order.created_at)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !error && (
                  <tr>
                    <td colSpan={8} className="crm-empty">Geen orders gevonden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateOfferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        leads={leads}
        onCreated={refetch}
      />
    </>
  );
}
