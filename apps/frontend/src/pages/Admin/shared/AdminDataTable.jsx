import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react'

export default function AdminDataTable({
  rows,
  columns,
  searchKeys = [],
  searchPlaceholder = 'ค้นหา',
  filters = [],
  pageSize: initialPageSize = 25,
  emptyMessage = 'ไม่มีข้อมูล',
  defaultFilter = 'all',
  toolbarExtra = null,
  loading = false,
}) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(defaultFilter)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const filterDef = filters.find((item) => item.value === activeFilter)
    return rows.filter((row) => {
      if (keyword) {
        const matched = searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(keyword))
        if (!matched) return false
      }
      if (!filterDef || typeof filterDef.predicate !== 'function') return true
      return filterDef.predicate(row)
    })
  }, [rows, search, searchKeys, filters, activeFilter])

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = pageSize === -1 ? 1 : Math.min(page, totalPages)

  const pagedRows = useMemo(() => {
    if (pageSize === -1) return filteredRows
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [currentPage, filteredRows, pageSize])

  return (
    <div className="admin-ui-table-card">
      <div className="admin-ui-table-tools">
        <div className="admin-ui-table-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder={searchPlaceholder}
          />
        </div>
        {filters.length ? (
          <div className="admin-ui-filter-row">
            <Filter size={15} />
            {filters.map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={filter.value === activeFilter ? 'active' : ''}
                onClick={() => {
                  setActiveFilter(filter.value)
                  setPage(1)
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        ) : null}
        {toolbarExtra}
      </div>

      <div className="admin-ui-table-wrap">
        <table className="admin-ui-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="admin-ui-table-empty">กําลังโหลด...</div>
                </td>
              </tr>
            ) : pagedRows.length ? (
              pagedRows.map((row) => (
                <tr key={row.id || row.teamId || row.memberId}>
                  {columns.map((column) => (
                    <td key={`${row.id || row.teamId || row.memberId}-${column.key}`}>
                      {typeof column.render === 'function' ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <div className="admin-ui-table-empty">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-ui-table-pager">
        <div className="admin-ui-page-size-selector">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(event.target.value === 'all' ? -1 : Number(event.target.value))
              setPage(1)
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="all">All</option>
          </select>
        </div>
        <span>
          {pageSize === -1
            ? `${filteredRows.length} rows`
            : `Page ${currentPage} / ${totalPages} (${filteredRows.length} rows)`}
        </span>
        <div>
          <button type="button" disabled={currentPage === 1} onClick={() => setPage((prev) => prev - 1)}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" disabled={pageSize === -1 || currentPage === totalPages} onClick={() => setPage((prev) => prev + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
