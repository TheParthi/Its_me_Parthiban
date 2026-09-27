import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/format'
import { EmptyState, ErrorState, SkeletonRows } from './Display'
import { Checkbox } from './Field'
import { Pagination } from './Navigation'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  headerClassName?: string
  /** Hidden in the mobile card view. */
  hideOnMobile?: boolean
  /** Used as the card title on mobile. */
  primary?: boolean
  /** Client-side search/sort value. */
  value?: (row: T) => string | number
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  getRowId: (row: T) => string
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  empty?: ReactNode
  /** Client-side search across `value`s when no `onSearch` is given. */
  searchable?: boolean
  searchPlaceholder?: string
  search?: string
  onSearch?: (q: string) => void
  toolbar?: ReactNode
  /** Client-side pagination size; set `serverPage` for server paging. */
  pageSize?: number
  serverPage?: { page: number; pageSize: number; total: number; onPage: (p: number) => void }
  selectable?: boolean
  selected?: Set<string>
  onSelectedChange?: (s: Set<string>) => void
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
  activeRowId?: string | null
  className?: string
  /** Rendered below a row when it is expanded. */
  expanded?: (row: T) => ReactNode | null
  caption?: string
}

/**
 * Table on md+, cards on mobile. Search/filter/pagination client- or
 * server-side. Row selection for bulk actions.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading,
  error,
  onRetry,
  empty,
  searchable,
  searchPlaceholder = 'Search…',
  search,
  onSearch,
  toolbar,
  pageSize,
  serverPage,
  selectable,
  selected,
  onSelectedChange,
  onRowClick,
  rowClassName,
  activeRowId,
  className,
  expanded,
  caption,
}: DataTableProps<T>) {
  const [localQ, setLocalQ] = useState('')
  const [page, setPage] = useState(1)
  const q = onSearch ? (search ?? '') : localQ

  const filtered = useMemo(() => {
    if (!rows) return []
    if (onSearch || !q.trim()) return rows
    const needle = q.trim().toLowerCase()
    return rows.filter((r) =>
      columns.some((c) => {
        const v = c.value?.(r)
        return v !== undefined && String(v).toLowerCase().includes(needle)
      }),
    )
  }, [rows, q, onSearch, columns])

  const pageRows = useMemo(() => {
    if (!pageSize || serverPage) return filtered
    const p = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
    return filtered.slice((p - 1) * pageSize, p * pageSize)
  }, [filtered, pageSize, page, serverPage])

  const ids = pageRows.map(getRowId)
  const allSelected = !!selected && ids.length > 0 && ids.every((id) => selected.has(id))
  const someSelected = !!selected && ids.some((id) => selected.has(id))
  const toggleAll = () => {
    if (!onSelectedChange) return
    const s = new Set(selected)
    if (allSelected) ids.forEach((id) => s.delete(id))
    else ids.forEach((id) => s.add(id))
    onSelectedChange(s)
  }
  const toggle = (id: string) => {
    if (!onSelectedChange) return
    const s = new Set(selected)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    onSelectedChange(s)
  }

  const showSearch = searchable || !!onSearch
  const primary = columns.find((c) => c.primary) ?? columns[0]

  return (
    <div className={cn('min-w-0', className)}>
      {(showSearch || toolbar) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {showSearch && (
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setPage(1)
                  if (onSearch) onSearch(e.target.value)
                  else setLocalQ(e.target.value)
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="field-control h-9 w-full rounded-lg border border-line bg-[#0f121a] pl-9 pr-3 text-sm text-fg placeholder:text-dim focus:border-accent/70 focus:ring-2 focus:ring-accent/25"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading || !rows ? (
        <SkeletonRows rows={6} />
      ) : !pageRows.length ? (
        (empty ?? <EmptyState title={q ? 'No results match your search' : 'Nothing here yet'} compact />)
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
            <table className="w-full border-collapse text-left text-[13px]">
              {caption && <caption className="sr-only">{caption}</caption>}
              <thead>
                <tr className="border-b border-line bg-white/[0.02]">
                  {selectable && (
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} aria-label="Select all rows" />
                    </th>
                  )}
                  {columns.map((c) => (
                    <th key={c.key} scope="col" className={cn('px-3 py-2.5 font-mono text-[10.5px] font-medium uppercase tracking-wider text-muted', c.headerClassName)}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const id = getRowId(r)
                  const extra = expanded?.(r)
                  return (
                    <RowGroup key={id}>
                      <tr
                        onClick={onRowClick ? () => onRowClick(r) : undefined}
                        className={cn(
                          'border-b border-line last:border-b-0 transition-colors',
                          onRowClick && 'cursor-pointer hover:bg-white/[0.025]',
                          activeRowId === id && 'bg-accent/[0.07]',
                          selected?.has(id) && 'bg-accent/[0.05]',
                          rowClassName?.(r),
                        )}
                      >
                        {selectable && (
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={!!selected?.has(id)} onChange={() => toggle(id)} aria-label="Select row" />
                          </td>
                        )}
                        {columns.map((c) => (
                          <td key={c.key} className={cn('px-3 py-2.5 align-middle text-[#d5d9e1]', c.className)}>
                            {c.cell(r)}
                          </td>
                        ))}
                      </tr>
                      {extra && (
                        <tr className="border-b border-line bg-black/20">
                          <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-3">
                            {extra}
                          </td>
                        </tr>
                      )}
                    </RowGroup>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {pageRows.map((r) => {
              const id = getRowId(r)
              const extra = expanded?.(r)
              return (
                <li
                  key={id}
                  className={cn('rounded-xl border border-line bg-card p-3.5', activeRowId === id && 'border-accent/40', onRowClick && 'cursor-pointer')}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                >
                  <div className="flex items-start gap-3">
                    {selectable && (
                      <span onClick={(e) => e.stopPropagation()} className="pt-0.5">
                        <Checkbox checked={!!selected?.has(id)} onChange={() => toggle(id)} aria-label="Select row" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 text-sm font-medium text-fg">{primary.cell(r)}</div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                        {columns
                          .filter((c) => c !== primary && !c.hideOnMobile)
                          .map((c) => (
                            <div key={c.key} className="contents">
                              <dt className="font-mono text-[10.5px] uppercase tracking-wider text-dim">{c.header}</dt>
                              <dd className="min-w-0 text-[#d5d9e1]">{c.cell(r)}</dd>
                            </div>
                          ))}
                      </dl>
                      {extra && <div className="mt-3 border-t border-line pt-3">{extra}</div>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {serverPage ? (
            <Pagination {...serverPage} />
          ) : pageSize ? (
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onPage={setPage} />
          ) : null}
        </>
      )}
    </div>
  )
}

function RowGroup({ children }: { children: ReactNode }) {
  return <>{children}</>
}
