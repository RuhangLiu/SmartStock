import { useMemo, useState } from 'react';
import { addProduct, deleteProduct, editProduct, uploadProductImage } from '../services/api';
import { money, stockStatus } from '../utils';
import { useI18n } from '../i18n';

const emptyForm = {
  sku: '', name: '', origin: '', material: '', dye_technique: '', category: '',
  price: '', cost: '', quantity: '', low_stock_threshold: '5', image_url: ''
};

function ProductsPage({ products, user, onRefresh, notify }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return products.filter((product) =>
      [product.sku, product.name, product.origin, product.category].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [products, search]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit = (product) => { setEditing(product); setForm({ ...product }); setError(''); setShowForm(true); };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = {
      ...form,
      price: Number(form.price), cost: Number(form.cost), quantity: Number(form.quantity),
      low_stock_threshold: Number(form.low_stock_threshold)
    };
    try {
      if (editing) await editProduct(editing.id, payload);
      else await addProduct(payload);
      setShowForm(false);
      await onRefresh();
      notify(t(editing ? 'Product updated' : 'Product added'));
    } catch (err) { setError(t(err.message)); }
  };

  const remove = async (product) => {
    if (!window.confirm(t('Delete {name}?', { name: product.name }))) return;
    try { await deleteProduct(product.id); await onRefresh(); notify(t('Product deleted')); }
    catch (err) { notify(t(err.message)); }
  };

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('Only JPG, PNG, and WebP images are allowed'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('Image must be 5MB or smaller'));
      return;
    }
    setError('');
    setUploading(true);
    try {
      const uploaded = await uploadProductImage(file);
      setForm((current) => ({ ...current, image_url: uploaded.image_url }));
      notify(t('Image uploaded'));
    } catch (err) {
      setError(t(err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <section className="page-actions">
        <div className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search by product, SKU, origin, or category…')} /></div>
        {user.role === 'admin' && <button className="primary-button" onClick={openAdd}>＋ {t('Add Product')}</button>}
      </section>
      <section className="panel data-panel">
        <div className="panel-heading"><div><p className="overline">{t('GLOBAL CATALOG')}</p><h3>{t('Products')} <span className="muted-count">{filtered.length}</span></h3></div><span className="catalog-chip">{t('USD CATALOG')}</span></div>
        <div className="product-card-grid">
          {filtered.map((product) => {
            const status = stockStatus(product);
            return <article className="product-catalog-card" key={product.id}>
              <div className="product-photo">
                <img src={product.image_url || '/assets/products/cloud-scarf.jpg'} alt={product.name} onError={(event) => { event.currentTarget.src = '/assets/products/cloud-scarf.jpg'; }} />
                <span className={`status ${status.className}`}>{t(status.label)}</span>
              </div>
              <div className="product-card-content">
                <div className="product-card-kicker"><strong className="sku">{product.sku}</strong><span>{product.category}</span></div>
                <h3>{product.name}</h3>
                <p>{product.material || t('Handcrafted textile')} · {product.dye_technique || t('Artisan dye')}</p>
                <div className="product-card-stats">
                  <div><small>{t('Retail')}</small><strong>{money(product.price)}</strong></div>
                  <div><small>{t('Cost')}</small><strong>{money(product.cost)}</strong></div>
                  <div><small>{t('Stock')}</small><strong>{product.quantity}</strong></div>
                </div>
                <div className="product-card-footer">
                  <span>⌖ {product.origin || t('Origin not set')}</span>
                  {user.role === 'admin' && <div className="row-actions"><button onClick={() => openEdit(product)}>{t('Edit')}</button><button className="delete" onClick={() => remove(product)}>{t('Delete')}</button></div>}
                </div>
              </div>
            </article>;
          })}
          {!filtered.length && <p className="empty-state">{t('No products match your search.')}</p>}
        </div>
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}>
        <form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading"><div><p className="overline">{t(editing ? 'UPDATE CATALOG' : 'NEW CATALOG ITEM')}</p><h2>{t(editing ? 'Edit Product' : 'Add Product')}</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div>
          <div className="form-grid">
            <label>SKU<input value={form.sku || ''} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="DW-SCF-001" required /></label>
            <label>{t('Product Name')}<input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label>{t('Category')}<input value={form.category || ''} onChange={(event) => setForm({ ...form, category: event.target.value })} required /></label>
            <label>{t('Craft Origin')}<input value={form.origin || ''} onChange={(event) => setForm({ ...form, origin: event.target.value })} /></label>
            <label>{t('Material')}<input value={form.material || ''} onChange={(event) => setForm({ ...form, material: event.target.value })} /></label>
            <label>{t('Dye Technique')}<input value={form.dye_technique || ''} onChange={(event) => setForm({ ...form, dye_technique: event.target.value })} /></label>
            <label>{t('Retail Price (USD)')}<input type="number" min="0" step=".01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></label>
            <label>{t('Cost (USD)')}<input type="number" min="0" step=".01" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} required /></label>
            <label>{t('Quantity')}<input type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></label>
            <label>{t('Low-Stock Threshold')}<input type="number" min="0" value={form.low_stock_threshold} onChange={(event) => setForm({ ...form, low_stock_threshold: event.target.value })} required /></label>
            <label className="wide-field">{t('Product Image URL')}<input value={form.image_url || ''} onChange={(event) => setForm({ ...form, image_url: event.target.value })} placeholder="/assets/products/cloud-scarf.jpg or https://…" /></label>
            <div className="image-upload-field wide-field">
              <div><strong>{t('Upload from your device')}</strong><small>{t('JPG, PNG, or WebP · Maximum 5MB')}</small></div>
              <label className={`secondary-button image-file-button ${uploading ? 'disabled' : ''}`}>
                {t(uploading ? 'Uploading…' : 'Choose Image')}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} disabled={uploading} />
              </label>
            </div>
          </div>
          {form.image_url && <div className="product-image-preview"><img src={form.image_url} alt={t('Product preview')} /><div><strong>{t('Image preview')}</strong><small>{t('Use a square product image for the best result.')}</small></div></div>}
          {error && <div className="message error">{error}</div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>{t('Cancel')}</button><button className="primary-button">{t(editing ? 'Save Changes' : 'Add Product')}</button></div>
        </form>
      </div>}
    </>
  );
}

export default ProductsPage;
