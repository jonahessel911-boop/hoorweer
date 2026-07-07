import { useState } from 'react';
import { Modal } from '../../../components/Modal';
import { useRealtimeProducts } from '../../../hooks/useRealtimeProducts';
import { createProduct, updateProduct, deleteProduct } from '../../../lib/db';
import { formatEuro } from '../../../lib/pricing';
import { readImageAsDataUrl } from '../../../lib/productUtils';
import type { Product } from '../../../lib/types';

const EMPTY_FORM = {
  naam: '',
  model: '',
  beschrijving: '',
  listprijs: '',
  kenmerken: '',
  actief: true,
  image_url: null as string | null,
};

export function ProductsTab() {
  const { products, loading, error, refetch } = useRealtimeProducts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      naam: product.naam,
      model: product.model,
      beschrijving: product.beschrijving,
      listprijs: String(product.listprijs),
      kenmerken: product.kenmerken,
      actief: product.actief,
      image_url: product.image_url,
    });
    setSaveError(null);
    setModalOpen(true);
  };

  const handleImage = async (file: File | null) => {
    if (!file) return;
    setImageLoading(true);
    setSaveError(null);
    try {
      const dataUrl = await readImageAsDataUrl(file);
      setForm((f) => ({ ...f, image_url: dataUrl }));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Afbeelding uploaden mislukt.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.naam.trim() || !form.model.trim() || !form.listprijs) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      naam: form.naam.trim(),
      model: form.model.trim(),
      beschrijving: form.beschrijving.trim(),
      listprijs: parseFloat(form.listprijs),
      kenmerken: form.kenmerken.trim(),
      actief: form.actief,
      image_url: form.image_url,
    };

    try {
      if (editing) {
        const { error } = await updateProduct(editing.id, payload);
        if (error) {
          setSaveError(error);
          return;
        }
      } else {
        const { error } = await createProduct(payload);
        if (error) {
          setSaveError(error);
          return;
        }
      }
      setModalOpen(false);
      refetch();
    } catch {
      setSaveError('Opslaan mislukt. Probeer een kleinere foto of vernieuw de pagina.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Product verwijderen?')) return;
    await deleteProduct(id);
    refetch();
  };

  return (
    <>
      <div className="crm-toolbar">
        <div className="crm-toolbar-left">
          <h1 className="crm-title">Producten</h1>
          <span className="crm-count">{products.length} producten</span>
        </div>
        <button type="button" className="btn btn-primary btn-compact" onClick={openCreate}>
          + Nieuw product
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <p>Kon producten niet laden.</p>
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
                  <th style={{ width: 72 }}>Foto</th>
                  <th>Naam</th>
                  <th>Model</th>
                  <th>Prijs</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}>Acties</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="product-thumb" />
                      ) : (
                        <span className="crm-muted">—</span>
                      )}
                    </td>
                    <td className="crm-link" style={{ cursor: 'pointer' }} onClick={() => openEdit(product)}>
                      {product.naam}
                    </td>
                    <td>{product.model}</td>
                    <td className="crm-num">{formatEuro(product.listprijs)}</td>
                    <td>
                      <span className={`product-status ${product.actief ? 'product-active' : 'product-inactive'}`}>
                        {product.actief ? 'Actief' : 'Inactief'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="crm-text-action" onClick={() => openEdit(product)}>
                        Bewerken
                      </button>
                      {' · '}
                      <button type="button" className="crm-text-action" onClick={() => handleDelete(product.id)}>
                        Verwijder
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="crm-empty">Nog geen producten.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Product bewerken' : 'Nieuw product'}
        large
      >
        {saveError && (
          <div className="error-banner" style={{ marginBottom: 16, padding: '10px 12px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{saveError}</p>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="p-naam">Naam</label>
          <input id="p-naam" className="form-input" value={form.naam} onChange={(e) => setForm({ ...form, naam: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="p-model">Model</label>
          <input id="p-model" className="form-input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="p-prijs">Listprijs (€)</label>
          <input id="p-prijs" type="number" step="0.01" className="form-input" value={form.listprijs} onChange={(e) => setForm({ ...form, listprijs: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="p-beschrijving">Beschrijving</label>
          <textarea id="p-beschrijving" className="form-input" rows={3} value={form.beschrijving} onChange={(e) => setForm({ ...form, beschrijving: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="p-kenmerken">Kenmerken (één per regel)</label>
          <textarea id="p-kenmerken" className="form-input" rows={4} value={form.kenmerken} onChange={(e) => setForm({ ...form, kenmerken: e.target.value })} placeholder="2 jaar garantie&#10;30 dagen op proef" />
        </div>
        <div className="form-group">
          <label>Productfoto</label>
          {form.image_url && (
            <img src={form.image_url} alt="Preview" className="product-form-preview" />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={imageLoading}
            onChange={(e) => {
              handleImage(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          {imageLoading && <p className="crm-muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>Afbeelding verwerken...</p>}
        </div>
        <div className="checkbox-group">
          <input id="p-actief" type="checkbox" checked={form.actief} onChange={(e) => setForm({ ...form, actief: e.target.checked })} />
          <label htmlFor="p-actief">Actief (zichtbaar bij offertes)</label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuleren</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || !form.naam.trim() || !form.model.trim() || !form.listprijs}>
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </Modal>
    </>
  );
}
