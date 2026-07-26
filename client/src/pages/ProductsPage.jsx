import { useMemo, useState } from 'react';
import { addProduct, deleteProduct, editProduct } from '../services/api';
import { money, stockStatus } from '../utils';

const emptyForm = {
  sku: '', name: '', origin: '', material: '', dye_technique: '', category: '',
  price: '', cost: '', quantity: '', low_stock_threshold: '5'
};

function ProductsPage({ products, user, onRefresh, notify }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

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
      notify(editing ? 'Product updated' : 'Product added');
    } catch (err) { setError(err.message); }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try { await deleteProduct(product.id); await onRefresh(); notify('Product deleted'); }
    catch (err) { notify(err.message); }
  };

  return (
    <>
      <section className="page-actions">
        <div className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product, SKU, origin, or category…" /></div>
        {user.role === 'admin' && <button className="primary-button" onClick={openAdd}>＋ Add Product</button>}
      </section>
      <section className="panel data-panel">
        <div className="panel-heading"><div><p className="overline">GLOBAL CATALOG</p><h3>Products <span className="muted-count">{filtered.length}</span></h3></div><span className="catalog-chip">USD CATALOG</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>SKU</th><th>Product</th><th>Origin</th><th>Category</th><th>Price</th><th>Cost</th><th>Stock</th><th>Status</th>{user.role === 'admin' && <th>Actions</th>}</tr></thead>
            <tbody>
              {filtered.map((product) => {
                const status = stockStatus(product);
                return <tr key={product.id}>
                  <td><strong className="sku">{product.sku}</strong></td>
                  <td><div className="table-product"><span>{product.name[0]}</span><div><strong>{product.name}</strong><small>{product.material} · {product.dye_technique}</small></div></div></td>
                  <td>{product.origin || '—'}</td><td>{product.category}</td><td>{money(product.price)}</td><td>{money(product.cost)}</td>
                  <td><strong>{product.quantity}</strong></td><td><span className={`status ${status.className}`}>{status.label}</span></td>
                  {user.role === 'admin' && <td><div className="row-actions"><button onClick={() => openEdit(product)}>Edit</button><button className="delete" onClick={() => remove(product)}>Delete</button></div></td>}
                </tr>;
              })}
            </tbody>
          </table>
          {!filtered.length && <p className="empty-state">No products match your search.</p>}
        </div>
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}>
        <form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading"><div><p className="overline">{editing ? 'UPDATE CATALOG' : 'NEW CATALOG ITEM'}</p><h2>{editing ? 'Edit Product' : 'Add Product'}</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div>
          <div className="form-grid">
            <label>SKU<input value={form.sku || ''} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="DW-SCF-001" required /></label>
            <label>Product Name<input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label>Category<input value={form.category || ''} onChange={(event) => setForm({ ...form, category: event.target.value })} required /></label>
            <label>Craft Origin<input value={form.origin || ''} onChange={(event) => setForm({ ...form, origin: event.target.value })} /></label>
            <label>Material<input value={form.material || ''} onChange={(event) => setForm({ ...form, material: event.target.value })} /></label>
            <label>Dye Technique<input value={form.dye_technique || ''} onChange={(event) => setForm({ ...form, dye_technique: event.target.value })} /></label>
            <label>Retail Price (USD)<input type="number" min="0" step=".01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></label>
            <label>Cost (USD)<input type="number" min="0" step=".01" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} required /></label>
            <label>Quantity<input type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></label>
            <label>Low-Stock Threshold<input type="number" min="0" value={form.low_stock_threshold} onChange={(event) => setForm({ ...form, low_stock_threshold: event.target.value })} required /></label>
          </div>
          {error && <div className="message error">{error}</div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button">{editing ? 'Save Changes' : 'Add Product'}</button></div>
        </form>
      </div>}
    </>
  );
}

export default ProductsPage;
