import type { ColumnDef, SortingFn, Column } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from 'lucide-react'

export type GameWithRating = {
  id: number
  name: string
  imageUrl: string | null
  platform: string | null
  entitlementId: string
  isActive: boolean | null
  topCriticAverage: number | null
  criticsRecommend: number | null
  playerRating: string | null
  tier: string | null
  url: string | null
  hasFailed: boolean
  errorMessage: string | null
}

const TIER_ORDER: Record<string, number> = {
  mighty: 5,
  strong: 4,
  fair: 3,
  weak: 2,
  poor: 1,
}

const tierSortingFn: SortingFn<GameWithRating> = (rowA, rowB, columnId) => {
  const tierA = rowA.getValue(columnId) as string | null
  const tierB = rowB.getValue(columnId) as string | null

  const orderA = tierA ? (TIER_ORDER[tierA.toLowerCase()] ?? 0) : 0
  const orderB = tierB ? (TIER_ORDER[tierB.toLowerCase()] ?? 0) : 0

  return orderA - orderB
}

function getTierColor(tier: string | null): string {
  switch (tier?.toLowerCase()) {
    case 'mighty':
      return 'bg-emerald-500 hover:bg-emerald-600'
    case 'strong':
      return 'bg-green-500 hover:bg-green-600'
    case 'fair':
      return 'bg-yellow-500 hover:bg-yellow-600'
    case 'weak':
      return 'bg-orange-500 hover:bg-orange-600'
    case 'poor':
      return 'bg-red-500 hover:bg-red-600'
    default:
      return 'bg-gray-500 hover:bg-gray-600'
  }
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 80) return 'text-emerald-400'
  if (score >= 70) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 50) return 'text-orange-400'
  return 'text-red-400'
}

function SortableHeader({ column, children }: { column: Column<GameWithRating, unknown>, children: React.ReactNode }) {
  const isSorted = column.getIsSorted()

  return (
    <button
      className={`flex items-center gap-1 transition-colors ${
        isSorted ? 'text-cyan-400' : 'hover:text-white'
      }`}
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {children}
      {isSorted === 'asc' ? (
        <ArrowUp className="h-4 w-4" />
      ) : isSorted === 'desc' ? (
        <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  )
}

export const columns: ColumnDef<GameWithRating>[] = [
  {
    accessorKey: 'imageUrl',
    header: '',
    size: 60,
    minSize: 60,
    maxSize: 60,
    cell: ({ row }) => {
      const imageUrl = row.getValue('imageUrl') as string | null
      return imageUrl ? (
        <img
          src={imageUrl}
          alt={row.getValue('name')}
          className="w-12 h-12 object-cover rounded"
        />
      ) : (
        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-gray-500">
          ?
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    size: 300,
    minSize: 300,
    maxSize: 300,
    cell: ({ row }) => {
      return (
        <div className="font-medium w-[280px] truncate">
          {row.getValue('name')}
        </div>
      )
    },
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    size: 100,
    minSize: 100,
    maxSize: 100,
    cell: ({ row }) => {
      const platform = row.getValue('platform') as string | null
      if (!platform) return <span className="text-gray-500">-</span>

      const isPS5 = platform.toLowerCase().includes('ps5')
      const isPS4 = platform.toLowerCase().includes('ps4')

      return (
        <Badge
          className={`text-xs text-white ${
            isPS5
              ? 'bg-blue-600 hover:bg-blue-700'
              : isPS4
                ? 'bg-indigo-500 hover:bg-indigo-600'
                : 'bg-slate-600 hover:bg-slate-700'
          }`}
        >
          {platform}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'topCriticAverage',
    header: ({ column }) => <SortableHeader column={column}>Score</SortableHeader>,
    size: 80,
    minSize: 80,
    maxSize: 80,
    cell: ({ row }) => {
      const score = row.getValue('topCriticAverage') as number | null
      const hasFailed = row.original.hasFailed

      if (hasFailed) {
        return (
          <Badge variant="destructive" className="text-xs">
            Error
          </Badge>
        )
      }

      return score !== null ? (
        <span className={`font-bold ${getScoreColor(score)}`}>{score}</span>
      ) : (
        <span className="text-gray-500">-</span>
      )
    },
  },
  {
    accessorKey: 'criticsRecommend',
    header: ({ column }) => <SortableHeader column={column}>Recommend %</SortableHeader>,
    size: 130,
    minSize: 130,
    maxSize: 130,
    cell: ({ row }) => {
      const recommend = row.getValue('criticsRecommend') as number | null
      return recommend !== null ? (
        <span className={getScoreColor(recommend)}>{recommend}%</span>
      ) : (
        <span className="text-gray-500">-</span>
      )
    },
  },
  {
    accessorKey: 'playerRating',
    header: ({ column }) => <SortableHeader column={column}>Player</SortableHeader>,
    size: 80,
    minSize: 80,
    maxSize: 80,
    cell: ({ row }) => {
      const playerRating = row.getValue('playerRating') as string | null
      return playerRating ? (
        <span className="text-blue-400">{playerRating}</span>
      ) : (
        <span className="text-gray-500">-</span>
      )
    },
  },
  {
    accessorKey: 'tier',
    header: ({ column }) => <SortableHeader column={column}>Tier</SortableHeader>,
    size: 90,
    minSize: 90,
    maxSize: 90,
    sortingFn: tierSortingFn,
    cell: ({ row }) => {
      const tier = row.getValue('tier') as string | null
      return tier ? (
        <Badge className={getTierColor(tier)}>{tier}</Badge>
      ) : (
        <span className="text-gray-500">-</span>
      )
    },
  },
  {
    accessorKey: 'url',
    header: 'Link',
    size: 60,
    minSize: 60,
    maxSize: 60,
    cell: ({ row }) => {
      const url = row.getValue('url') as string | null
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <span className="text-gray-500">-</span>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'hasFailed',
    header: 'Status',
    size: 100,
    minSize: 100,
    maxSize: 100,
    cell: ({ row }) => {
      const hasFailed = row.getValue('hasFailed') as boolean
      const errorMessage = row.original.errorMessage

      if (hasFailed) {
        return (
          <div className="flex flex-col">
            <Badge variant="destructive">Failed</Badge>
            {errorMessage && (
              <span className="text-xs text-red-400 mt-1 w-[90px] truncate">
                {errorMessage}
              </span>
            )}
          </div>
        )
      }

      const hasRating = row.original.topCriticAverage !== null
      return hasRating ? (
        <Badge className="bg-emerald-600">Rated</Badge>
      ) : (
        <Badge variant="secondary">Pending</Badge>
      )
    },
  },
]
