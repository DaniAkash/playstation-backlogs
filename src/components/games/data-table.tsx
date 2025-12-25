import { useState, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type ColumnOrderState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

type StatusFilter = 'all' | 'rated' | 'failed' | 'pending'
type PlatformFilter = 'all' | 'ps4' | 'ps5'

const COLUMN_LABELS: Record<string, string> = {
  imageUrl: 'Image',
  name: 'Name',
  platform: 'Platform',
  topCriticAverage: 'Score',
  criticsRecommend: 'Recommend %',
  playerRating: 'Player Rating',
  tier: 'Tier',
  url: 'Link',
  hasFailed: 'Status',
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    columns.map((col) => (col as any).accessorKey as string)
  )
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [pageSize, setPageSize] = useState<number>(20)

  const filteredData = useMemo(() => {
    return data.filter((row: any) => {
      // Status filter
      let passesStatus = true
      if (statusFilter === 'failed') passesStatus = row.hasFailed
      else if (statusFilter === 'rated') passesStatus = !row.hasFailed && row.topCriticAverage !== null
      else if (statusFilter === 'pending') passesStatus = !row.hasFailed && row.topCriticAverage === null

      // Platform filter
      let passesPlatform = true
      if (platformFilter === 'ps4') passesPlatform = row.platform?.toLowerCase()?.includes('ps4')
      else if (platformFilter === 'ps5') passesPlatform = row.platform?.toLowerCase()?.includes('ps5')

      return passesStatus && passesPlatform
    })
  }, [data, statusFilter, platformFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder,
      globalFilter,
      pagination: {
        pageIndex: 0,
        pageSize: pageSize === -1 ? filteredData.length : pageSize,
      },
    },
  })

  const handlePageSizeChange = (value: string) => {
    const newSize = value === 'all' ? -1 : Number(value)
    setPageSize(newSize)
    table.setPageSize(newSize === -1 ? filteredData.length : newSize)
  }

  const moveColumn = (columnId: string, direction: 'up' | 'down') => {
    const currentIndex = columnOrder.indexOf(columnId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= columnOrder.length) return

    const newOrder = [...columnOrder]
    ;[newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]]
    setColumnOrder(newOrder)
  }

  const stats = useMemo(() => {
    const totalGames = data.length
    const ratedGames = data.filter((row: any) => !row.hasFailed && row.topCriticAverage !== null).length
    const failedGames = data.filter((row: any) => row.hasFailed).length
    const pendingGames = data.filter((row: any) => !row.hasFailed && row.topCriticAverage === null).length
    return { totalGames, ratedGames, failedGames, pendingGames }
  }, [data])

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Total:</span>
          <Badge variant="outline">{stats.totalGames}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Rated:</span>
          <Badge className="bg-emerald-600">{stats.ratedGames}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Pending:</span>
          <Badge variant="secondary">{stats.pendingGames}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Failed:</span>
          <Badge variant="destructive">{stats.failedGames}</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search games..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
          />

          {/* Column Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-slate-800 border-slate-700 text-gray-300 hover:bg-slate-700 hover:text-white">
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-slate-800 border-slate-700">
              <DropdownMenuLabel className="text-gray-300">Toggle & Reorder Columns</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <div className="max-h-[400px] overflow-y-auto">
                {columnOrder.map((columnId, index) => {
                  const column = table.getColumn(columnId)
                  if (!column) return null

                  return (
                    <div
                      key={columnId}
                      className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-700 rounded-sm"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="h-4 w-4 text-gray-500" />
                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={column.getIsVisible()}
                            onChange={(e) => column.toggleVisibility(e.target.checked)}
                            className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-300">
                            {COLUMN_LABELS[columnId] || columnId}
                          </span>
                        </label>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveColumn(columnId, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => moveColumn(columnId, 'down')}
                          disabled={index === columnOrder.length - 1}
                          className="p-1 hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <DropdownMenuSeparator className="bg-slate-700" />
              <div className="px-2 py-1.5">
                <button
                  onClick={() => {
                    table.getAllColumns().forEach((col) => col.toggleVisibility(true))
                    setColumnOrder(columns.map((col) => (col as any).accessorKey as string))
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Reset to default
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Status filter */}
          <div className="flex gap-2">
            <span className="text-gray-400 self-center text-sm">Status:</span>
            {(['all', 'rated', 'pending', 'failed'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg transition-colors text-sm ${
                  statusFilter === status
                    ? status === 'all' ? 'bg-cyan-500 text-white'
                    : status === 'rated' ? 'bg-emerald-500 text-white'
                    : status === 'pending' ? 'bg-gray-500 text-white'
                    : 'bg-red-500 text-white'
                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Platform filter */}
          <div className="flex gap-2">
            <span className="text-gray-400 self-center text-sm">Platform:</span>
            {(['all', 'ps4', 'ps5'] as PlatformFilter[]).map((platform) => (
              <button
                key={platform}
                onClick={() => setPlatformFilter(platform)}
                className={`px-3 py-1.5 rounded-lg transition-colors text-sm ${
                  platformFilter === platform
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {platform === 'all' ? 'All' : platform.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        <Table className="table-fixed">
          <TableHeader className="bg-slate-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-slate-700 hover:bg-slate-800">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-gray-300"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-slate-700 hover:bg-slate-800/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="text-gray-200"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-400"
                >
                  No games found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-300">
        <div className="text-sm">
          Showing {table.getRowModel().rows.length} of {filteredData.length} games
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {'<<'}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {'<'}
          </button>
          <span className="px-4 py-1">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount() || 1}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {'>'}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 bg-slate-800 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {'>>'}
          </button>
        </div>
        <select
          value={pageSize === -1 ? 'all' : pageSize}
          onChange={(e) => handlePageSizeChange(e.target.value)}
          className="px-3 py-1 bg-slate-800 rounded-md border border-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
        >
          {[10, 20, 30, 50, 100].map((size) => (
            <option key={size} value={size}>
              Show {size}
            </option>
          ))}
          <option value="all">Show All</option>
        </select>
      </div>
    </div>
  )
}
