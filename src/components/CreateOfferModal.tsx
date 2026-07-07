import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { useRealtimeProducts } from '../hooks/useRealtimeProducts';
import { createOrder } from '../lib/db';
import { calcFinalPrice, formatEuro } from '../lib/pricing';
import { productToOrderFields } from '../lib/productUtils';
import type { Product } from '../lib/types';

interface CreateOfferModalProps {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  leads?: { id: string; naam: string; telefoon: string }[];
  onCreated?: () => void;
}

export function CreateOfferModal({
  open,
  onClose,
  leadId: presetLeadId,
  leads = [],
  onCreated,
}: CreateOfferModalProps) {
  const navigate = useNavigate();
  const { products, loading } = useRealtimeProducts();
  const activeProducts = products.filter((p) => p.actief);

  const [leadId, setLeadId] = useState(presetLeadId || '');
  const [productId, setProductId] = useState('');
  const [korting, setKorting] = useState('0');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (open) {
      setLeadId(presetLeadId || '');
      if (activeProducts.length > 0 && !productId) {
        setProductId(activeProducts[0].id);
      }
    }
  }, [open, presetLeadId, activeProducts, productId]);

  const selected = activeProducts.find((p) => p.id === productId) ?? null;
  const kortingBedrag = parseFloat(korting) || 0;
  const listprijs = selected?.listprijs ?? 0;
  const finalPrice = calcFinalPrice(listprijs, kortingBedrag);

  const handleCreate = async () => {
    if (!leadId || !selected) return;
    setSaving(true);
    setSaveError('');
    const fields = productToOrderFields(selected, kortingBedrag);
    const { data, error } = await createOrder({ lead_id: leadId, ...fields });
    setSaving(false);
    if (error || !data) {
      setSaveError(error || 'Kon offerte niet aanmaken.');
      return;
    }
    setKorting('0');
    onClose();
    onCreated?.();
    navigate(`/admin/orders/${data.id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Offerte aanmaken">
      {leads.length > 0 && !presetLeadId && (
        <div className="form-group">
          <label htmlFor="offer-lead">Lead</label>
          <select
            id="offer-lead"
            className="form-input"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          >
            <option value="">Kies een lead...</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.naam} — {lead.telefoon}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="offer-product">Product</label>
        {loading ? (
          <p className="crm-muted">Producten laden...</p>
        ) : activeProducts.length === 0 ? (
          <p className="crm-muted">Geen actieve producten. Voeg eerst een product toe onder Producten.</p>
        ) : (
          <select
            id="offer-product"
            className="form-input"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {activeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.naam} ({p.model}) — {formatEuro(p.listprijs)}
              </option>
            ))}
          </select>
        )}
      </div>

      {selected && <ProductPreview product={selected} />}

      <div className="form-group">
        <label htmlFor="offer-korting">Korting (€)</label>
        <input
          id="offer-korting"
          type="number"
          step="0.01"
          min="0"
          max={listprijs}
          className="form-input"
          value={korting}
          onChange={(e) => setKorting(e.target.value)}
        />
      </div>

      <div className="offer-price-summary">
        <div className="offer-price-row">
          <span>Listprijs</span>
          <span>{formatEuro(listprijs)}</span>
        </div>
        {kortingBedrag > 0 && (
          <div className="offer-price-row offer-price-discount">
            <span>Korting</span>
            <span>− {formatEuro(kortingBedrag)}</span>
          </div>
        )}
        <div className="offer-price-row offer-price-total">
          <span>Totaal offerte</span>
          <span>{formatEuro(finalPrice)}</span>
        </div>
      </div>

      <div className="modal-actions">
        {saveError && <p className="contract-error" style={{ width: '100%', margin: 0 }}>{saveError}</p>}
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuleren
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={saving || !leadId || !selected || finalPrice < 0}
        >
          {saving ? 'Aanmaken...' : 'Offerte aanmaken'}
        </button>
      </div>
    </Modal>
  );
}

function ProductPreview({ product }: { product: Product }) {
  return (
    <div className="offer-product-preview">
      {product.image_url && (
        <img src={product.image_url} alt={product.naam} className="offer-product-preview-img" />
      )}
      <div>
        <strong>{product.naam}</strong>
        <div className="crm-muted" style={{ fontSize: '0.85rem' }}>Model {product.model}</div>
      </div>
    </div>
  );
}
