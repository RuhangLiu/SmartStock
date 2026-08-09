import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchDatabaseRows, fetchDatabaseTables } from '../services/api';
import { useI18n } from '../i18n';

const PAGE_SIZE = 25;

function humanize(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function CellValue({ value }) {
  if (value === null || value === undefined || value === '') return <span className="database-null">—</span>;
  const text = String(value);
  return <span className={text.length > 42 ? 'database-cell-long' : ''} title={text}>{text}</span>;
}

export default function DatabasePage({ user }) {
  const { t } = useI18n();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('products');
  const [tableData, setTableData] = useState(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTables = useCallback(async () => {
    const result = await fetchDatabaseTables();
    setTables(result.tables);
    if (!result.tables.some((table) => table.name === selectedTable) && result.tables[0]) {
      setSelectedTable(result.tables[0].name);
    }
  }, [selectedTable]);

  const loadRows = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchDatabaseRows(selectedTable, { search, page, pageSize: PAGE_SIZE });
      setTableData(result);
      if (result.pagination.page !== page) setPage(result.pagination.page);
    } catch (requestError) {
      setError(t(requestError.message));
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedTable, t]);

  useEffect(() => {
    if (user.role !== 'admin') return;
    loadTables().catch((requestError) => {
      setError(t(requestError.message));
      setLoading(false);
    });
  }, [loadTables, t, user.role]);

  useEffect(() => {
    if (user.role === 'admin') loadRows();
  }, [loadRows, user.role]);

  const selectedMeta = useMemo(
    () => tables.find((table) => table.name === selectedTable),
    [selectedTable, tables]
  );

  if (user.role !== 'admin') {
    return (
      <section className="permission-card">
        <h2>{t('Admin access required')}</h2>
        <p>{t('The database viewer is available to administrators only.')}</p>
      </section>
    );
  }

  const selectTable = (name) => {
    setSelectedTable(name);
    setSearchDraft('');
    setSearch('');
    setPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      await loadTables();
      await loadRows();
    } catch (requestError) {
      setError(t(requestError.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="database-viewer">
      <div className="database-guardrail">
        <div>
          <span className="database-lock" aria-hidden="true">⌁</span>
          <div>
            <strong>{t('Read-only database access')}</strong>
            <p>{t('Browse approved tables safely. Editing, deleting, and custom SQL are disabled.')}</p>
          </div>
        </div>
        <span className="read-only-badge">{t('READ ONLY')}</span>
      </div>

      <div className="database-layout">
        <aside className="database-tables panel">
          <div className="panel-heading">
            <div><p className="overline">{t('SQLITE DATABASE')}</p><h2>{t('Tables')}</h2></div>
            <span>{tables.length}</span>
          </div>
          <div className="database-table-list">
            {tables.map((table) => (
              <button
                key={table.name}
                type="button"
                className={selectedTable === table.name ? 'active' : ''}
                onClick={() => selectTable(table.name)}
              >
                <span className="database-table-icon">▦</span>
                <span><strong>{t(humanize(table.name))}</strong><small>{t('{count} rows', { count: table.row_count })}</small></span>
                <b>{table.column_count}</b>
              </button>
            ))}
          </div>
        </aside>

        <div className="database-data panel data-panel">
          <div className="database-toolbar">
            <div>
              <p className="overline">{t('TABLE PREVIEW')}</p>
              <h2>{t(humanize(selectedTable))}</h2>
              <p>{t('{rows} rows · {columns} columns', {
                rows: selectedMeta?.row_count ?? tableData?.pagination.total ?? 0,
                columns: selectedMeta?.column_count ?? tableData?.columns.length ?? 0
              })}</p>
            </div>
            <div className="database-toolbar-actions">
              <form className="database-search" onSubmit={submitSearch}>
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder={t('Search this table…')}
                  aria-label={t('Search this table')}
                />
                <button type="submit">{t('Search')}</button>
              </form>
              <button className="secondary-button database-refresh" type="button" onClick={refresh}>↻ {t('Refresh')}</button>
            </div>
          </div>

          {search && (
            <div className="database-search-summary">
              <span>{t('Showing results for “{search}”', { search })}</span>
              <button type="button" onClick={() => { setSearchDraft(''); setSearch(''); setPage(1); }}>{t('Clear')}</button>
            </div>
          )}
          {error && <div className="message error database-message">{error}</div>}

          <div className="database-grid-wrap" aria-busy={loading}>
            <table className="database-grid">
              <thead>
                <tr>{tableData?.columns.map((column) => <th key={column.name}>{t(humanize(column.name))}<small>{column.type}</small></th>)}</tr>
              </thead>
              <tbody>
                {!loading && tableData?.rows.map((row, rowIndex) => (
                  <tr key={`${selectedTable}-${row.id ?? row.user_id ?? rowIndex}-${rowIndex}`}>
                    {tableData.columns.map((column) => <td key={column.name}><CellValue value={row[column.name]} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <div className="database-state">{t('Loading table…')}</div>}
            {!loading && tableData?.rows.length === 0 && <div className="database-state">{t('No matching database records.')}</div>}
          </div>

          <footer className="database-pagination">
            <span>{t('Page {page} of {pages} · {total} records', {
              page: tableData?.pagination.page ?? 1,
              pages: tableData?.pagination.total_pages ?? 1,
              total: tableData?.pagination.total ?? 0
            })}</span>
            <div>
              <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>← {t('Previous')}</button>
              <button type="button" disabled={loading || page >= (tableData?.pagination.total_pages ?? 1)} onClick={() => setPage((value) => value + 1)}>{t('Next')} →</button>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}
