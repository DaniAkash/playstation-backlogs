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
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

type StatusFilter = 'all' | 'rated' | 'failed' | 'pending'
type PlatformFilter = 'all' | 'ps4' | 'ps5'

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
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
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
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
        <input
          type="text"
          placeholder="Search games..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
        />
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
