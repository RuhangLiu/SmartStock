import { useCallback, useEffect, useMemo, useState } from 'react';
import { adjustInventory, fetchInventoryMovements } from '../services/api';
import { money, stockStatus } from '../utils';
import { useI18n } from '../i18n';

const movementTypes = ['', 'INITIAL', 'SALE', 'ADJUSTMENT', 'RETURN', 'PURCHASE'];

function InventoryPage({ products, lowStock, user, onRefresh, notify }) {
  const { t, language } = useI18n();
  const [filter, setFilter] = useState('All');
  const [movements, setMovements] = useState({ rows: [], pagination: { page: 1, total: 0, total_pages: 1 } });
  const [movementFilters, setMovementFilters] = useState({ productId: '', type: '', search: '', startDate: '', endDate: '', page: 1 });
  const [searchDraft, setSearchDraft] = useState('');
  const [movementLoading, setMovementLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(null);
  const [adjustment, setAdjustment] = useState({ direction: 'add', quantity: '10', reason: '' });
  const [adjustmentError, setAdjustmentError] = useState('');
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category))], [products]);
  const visible = filter === 'All' ? products : products.filter((product) => product.category === filter);

  const loadMovements = useCallback(async () => {
    setMovementLoading(true);
    try {
      const result = await fetchInventoryMovements(movementFilters);
      setMovements(result);
    } catch (error) {
      notify(t(error.message));
    } finally {
      setMovementLoading(false);
    }
  }, [movementFilters, notify, t]);

  useEffect(() => { loadMovements(); }, [loadMovements]);

  const updateMovementFilter = (key, value) => {
    setMovementFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const searchMovements = (event) => {
    event.preventDefault();
    updateMovementFilter('search', searchDraft.trim());
  };

  const openAdjustment = (product) => {
    setAdjusting(product);
    setAdjustment({ direction: 'add', quantity: '10', reason: '' });
    setAdjustmentError('');
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    const amount = Number(adjustment.quantity);
    if (!Number.isInteger(amount) || amount <= 0) {
      setAdjustmentError(t('Enter a positive whole number'));
      return;
    }
    if (!adjustment.reason.trim()) {
      setAdjustmentError(t('Adjustment reason is required'));
      return;
    }
    const quantityChange = adjustment.direction === 'add' ? amount : -amount;
    setSavingAdjustment(true);
    setAdjustmentError('');
    try {
      await adjustInventory({ product_id: adjusting.id, quantity_change: quantityChange, reason: adjustment.reason.trim() });
      setAdjusting(null);
      await Promise.all([onRefresh(), loadMovements()]);
      notify(t('Inventory adjusted successfully'));
    } catch (error) {
      setAdjustmentError(t(error.message));
    } finally {
      setSavingAdjustment(false);
    }
  };

  const formatMovementTime = (value) => new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date(`${value.replace(' ', 'T')}Z`));

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
            return <tr key={product.id}><td><strong>{product.name}</strong><small className="cell-note">{product.category}</small></td><td className="sku">{product.sku}</td><td><strong>{product.quantity}</strong></td><td>{product.low_stock_threshold}</td><td>{money(product.cost)}</td><td>{money(product.price * product.quantity)}</td><td><span className={`status ${status.className}`}>{t(status.label)}</span></td>{user.role === 'admin' && <td><button className="small-button" onClick={() => openAdjustment(product)}>± {t('Adjust Stock')}</button></td>}</tr>;
          })}</tbody></table>
        </div>
      </section>

      <section className="panel data-panel movement-panel">
        <div className="panel-heading movement-heading">
          <div><p className="overline">{t('INVENTORY LEDGER')}</p><h3>{t('Movement History')} <span className="muted-count">{movements.pagination.total}</span></h3></div>
          <span className="catalog-chip">{t('READ-ONLY HISTORY')}</span>
        </div>
        <div className="movement-filters">
          <select aria-label={t('Filter by product')} value={movementFilters.productId} onChange={(event) => updateMovementFilter('productId', event.target.value)}>
            <option value="">{t('All Products')}</option>
            {products.map((product) => <option value={product.id} key={product.id}>{product.sku} · {product.name}</option>)}
          </select>
          <select aria-label={t('Filter by movement type')} value={movementFilters.type} onChange={(event) => updateMovementFilter('type', event.target.value)}>
            {movementTypes.map((type) => <option value={type} key={type || 'all'}>{type ? t(type) : t('All Movement Types')}</option>)}
          </select>
          <input aria-label={t('Start date')} type="date" value={movementFilters.startDate} onChange={(event) => updateMovementFilter('startDate', event.target.value)} />
          <input aria-label={t('End date')} type="date" value={movementFilters.endDate} onChange={(event) => updateMovementFilter('endDate', event.target.value)} />
          <form className="movement-search" onSubmit={searchMovements}>
            <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder={t('Search SKU, product, reason, or operator…')} />
            <button type="submit">{t('Search')}</button>
          </form>
        </div>
        <div className="table-wrap movement-table-wrap">
          <table className="movement-table"><thead><tr><th>{t('Time')}</th><th>{t('Product')}</th><th>{t('Type')}</th><th>{t('Change')}</th><th>{t('Balance')}</th><th>{t('Reason')}</th><th>{t('Operator')}</th></tr></thead>
          <tbody>
            {!movementLoading && movements.rows.map((movement) => <tr key={movement.id}>
              <td className="movement-time">{formatMovementTime(movement.created_at)}</td>
              <td><strong>{movement.product_name}</strong><small className="cell-note">{movement.product_sku}</small></td>
              <td><span className={`movement-type ${movement.movement_type.toLowerCase()}`}>{t(movement.movement_type)}</span></td>
              <td><strong className={movement.quantity_change > 0 ? 'movement-positive' : movement.quantity_change < 0 ? 'movement-negative' : ''}>{movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}</strong></td>
              <td><span className="movement-balance">{movement.quantity_before} → {movement.quantity_after}</span></td>
              <td className="movement-reason">{movement.reason}</td>
              <td>{movement.created_by_name || t('System')}</td>
            </tr>)}
          </tbody></table>
          {movementLoading && <div className="movement-state">{t('Loading movement history…')}</div>}
          {!movementLoading && !movements.rows.length && <div className="movement-state">{t('No inventory movements match these filters.')}</div>}
        </div>
        <div className="movement-pagination">
          <span>{t('Page {page} of {totalPages}', { page: movements.pagination.page, totalPages: movements.pagination.total_pages })}</span>
          <div>
            <button disabled={movements.pagination.page <= 1} onClick={() => setMovementFilters((current) => ({ ...current, page: current.page - 1 }))}>{t('Previous')}</button>
            <button disabled={movements.pagination.page >= movements.pagination.total_pages} onClick={() => setMovementFilters((current) => ({ ...current, page: current.page + 1 }))}>{t('Next')}</button>
          </div>
        </div>
      </section>

      {lowStock.length > 0 && <section className="panel">
        <div className="panel-heading"><div><p className="overline">{t('ACTION REQUIRED')}</p><h3>{t('Reorder List')}</h3></div><span className="count-badge">{lowStock.length}</span></div>
        <div className="reorder-grid">{lowStock.map((product) => <article key={product.id}><span className="product-initial">{product.name[0]}</span><div><strong>{product.name}</strong><small>{product.sku} · {product.origin}</small></div><div className="align-right"><strong>{t('{count} left', { count: product.quantity })}</strong><small>{t('Reorder at {value}', { value: product.low_stock_threshold })}</small></div></article>)}</div>
      </section>}

      {adjusting && <div className="modal-backdrop" onMouseDown={() => setAdjusting(null)}>
        <form className="modal adjustment-modal" onSubmit={submitAdjustment} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading"><div><p className="overline">{t('INVENTORY ADJUSTMENT')}</p><h2>{t('Adjust Stock')}</h2></div><button type="button" onClick={() => setAdjusting(null)}>×</button></div>
          <div className="adjustment-product"><span>{adjusting.name[0]}</span><div><strong>{adjusting.name}</strong><small>{adjusting.sku} · {t('Current stock')}: {adjusting.quantity}</small></div></div>
          <div className="adjustment-direction" role="group" aria-label={t('Adjustment direction')}>
            <button type="button" className={adjustment.direction === 'add' ? 'active' : ''} onClick={() => setAdjustment({ ...adjustment, direction: 'add' })}>＋ {t('Add Stock')}</button>
            <button type="button" className={adjustment.direction === 'remove' ? 'active remove' : ''} onClick={() => setAdjustment({ ...adjustment, direction: 'remove' })}>− {t('Remove Stock')}</button>
          </div>
          <label>{t('Quantity')}<input type="number" min="1" step="1" value={adjustment.quantity} onChange={(event) => setAdjustment({ ...adjustment, quantity: event.target.value })} required /></label>
          <label>{t('Adjustment Reason')}<textarea rows="3" value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} placeholder={t('Example: New shipment received or damaged item')} required /></label>
          {adjustmentError && <div className="message error">{adjustmentError}</div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAdjusting(null)}>{t('Cancel')}</button><button className="primary-button" disabled={savingAdjustment}>{t(savingAdjustment ? 'Saving…' : 'Save Adjustment')}</button></div>
        </form>
      </div>}
    </>
  );
}

export default InventoryPage;
