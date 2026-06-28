import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Filter, GripVertical, Search } from 'lucide-react'
import EmptyState from './EmptyState'
import LoadingState from './LoadingState'

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
  reorderable = false,
  onReorder = null,
  getRowId = (row) => row.id,
}) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(defaultFilter)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

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

  // จัดลำดับด้วยการลากได้เฉพาะตอนที่เห็นทั้งชุดเรียงตามลำดับจริง (ไม่ค้นหา/ไม่กรอง/อยู่หน้าเดียว)
  const fitsOnePage = pageSize === -1 || filteredRows.length <= pageSize
  const canReorder = Boolean(reorderable && onReorder) && !search.trim() && activeFilter === 'all' && fitsOnePage
  const totalColumns = columns.length + (reorderable ? 1 : 0)

  const resetDrag = () => {
    setDragId(null)
    setOverId(null)
  }

  const handleDrop = () => {
    if (dragId == null || overId == null || dragId === overId) {
      resetDrag()
      return
    }
    const ids = rows.map(getRowId)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(overId)
    if (from < 0 || to < 0) {
      resetDrag()
      return
    }
    const next = [...rows]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder(next)
    resetDrag()
  }

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
              {reorderable ? <th className="admin-ui-reorder-th" aria-hidden="true" /> : null}
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={totalColumns}>
                  <LoadingState compact label="กําลังโหลดข้อมูลตาราง..." />
                </td>
              </tr>
            ) : pagedRows.length ? (
              pagedRows.map((row) => {
                const rowId = getRowId(row)
                const rowClass = [
                  dragId === rowId ? 'is-dragging' : '',
                  canReorder && overId === rowId && dragId !== rowId ? 'is-drop-target' : '',
                ].filter(Boolean).join(' ')
                return (
                  <tr
                    key={row.id || row.teamId || row.memberId}
                    className={rowClass || undefined}
                    draggable={canReorder}
                    onDragStart={canReorder ? () => setDragId(rowId) : undefined}
                    onDragOver={canReorder ? (event) => {
                      event.preventDefault()
                      if (overId !== rowId) setOverId(rowId)
                    } : undefined}
                    onDrop={canReorder ? handleDrop : undefined}
                    onDragEnd={canReorder ? resetDrag : undefined}
                  >
                    {reorderable ? (
                      <td className="admin-ui-reorder-cell">
                        <span
                          className={`admin-ui-drag-handle ${canReorder ? '' : 'is-disabled'}`}
                          title={canReorder ? 'ลากเพื่อจัดลำดับ' : 'ล้างการค้นหา/ตัวกรอง และดูทั้งหมดในหน้าเดียวเพื่อจัดลำดับ'}
                          aria-hidden="true"
                        >
                          <GripVertical size={15} />
                        </span>
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={`${row.id || row.teamId || row.memberId}-${column.key}`}>
                        {typeof column.render === 'function' ? column.render(row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={totalColumns}>
                  <EmptyState compact title={emptyMessage} />
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
