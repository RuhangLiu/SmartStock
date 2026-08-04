import { useMemo, useState } from 'react';
import { editProduct } from '../services/api';
import { money, stockStatus } from '../utils';
import { useI18n } from '../i18n';

function InventoryPage({ products, lowStock, user, onRefresh, notify }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState('All');
  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category))], [products]);
  const visible = filter === 'All' ? products : products.filter((product) => product.category === filter);

  const restock = async (product) => {
    const amount = window.prompt(t('Add how many units to {name}?', { name: product.name }), '10');
    if (amount === null) return;
    const quantity = Number(amount);
    if (!Number.isInteger(quantity) || quantity <= 0) return notify(t('Enter a positive whole number'));
    try {
      await editProduct(product.id, { ...product, quantity: Number(product.quantity) + quantity });
      await onRefresh();
      notify(t('{count} units added to inventory', { count: quantity }));
    } catch (error) { notify(t(error.message)); }
  };

  return (
    <>
      <section className="inventory-summary">
        <article><span>▦</span><div><small>{t('Total Units')}</small><strong>{products.reduce((sum, product) => sum + Number(product.quantity), 0).toLocaleString()}</strong></div></article>
        <article><span>!</span><div><small>{t('Low Stock SKUs')}</small><strong>{lowStock.length}</strong></div></article>
        <article><span>$</span><div><small>{t('Retail Value')}</small><strong>{money(products.reduce((sum, product) => sum + product.price * product.quantity, 0))}</strong></div></article>
        <article><span>◇</span><div><small>{t('Categories')}</small><strong>{categories.length - 1}</strong></div></article>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading responsive-heading">
          <div><p className="overline">{t('STOCK CONTROL')}</p><h3>{t('Inventory Summary')}</h3></div>
          <div className="filter-tabs">{categories.map((category) => <button className={filter === category ? 'active' : ''} onClick={() => setFilter(category)} key={category}>{category === 'All' ? t('All') : category}</button>)}</div>
        </div>
        <div className="table-wrap">
          <table><thead><tr><th>{t('Product')}</th><th>SKU</th><th>{t('Available')}</th><th>{t('Threshold')}</th><th>{t('Unit Cost')}</th><th>{t('Retail Value')}</th><th>{t('Status')}</th>{user.role === 'admin' && <th>{t('Action')}</th>}</tr></thead>
          <tbody>{visible.map((product) => {
            const status = stockStatus(product);
            return <tr key={product.id}><td><strong>{product.name}</strong><small className="cell-note">{product.category}</small></td><td className="sku">{product.sku}</td><td><strong>{product.quantity}</strong></td><td>{product.low_stock_threshold}</td><td>{money(product.cost)}</td><td>{money(product.price * product.quantity)}</td><td><span className={`status ${status.className}`}>{t(status.label)}</span></td>{user.role === 'admin' && <td><button className="small-button" onClick={() => restock(product)}>＋ {t('Restock')}</button></td>}</tr>;
          })}</tbody></table>
        </div>
      </section>
      {lowStock.length > 0 && <section className="panel">
        <div className="panel-heading"><div><p className="overline">{t('ACTION REQUIRED')}</p><h3>{t('Reorder List')}</h3></div><span className="count-badge">{lowStock.length}</span></div>
        <div className="reorder-grid">{lowStock.map((product) => <article key={product.id}><span className="product-initial">{product.name[0]}</span><div><strong>{product.name}</strong><small>{product.sku} · {product.origin}</small></div><div className="align-right"><strong>{t('{count} left', { count: product.quantity })}</strong><small>{t('Reorder at {value}', { value: product.low_stock_threshold })}</small></div></article>)}</div>
      </section>}
    </>
  );
}

export default InventoryPage;
