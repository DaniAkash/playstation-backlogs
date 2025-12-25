import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, ExternalLink } from 'lucide-react'

export type GameWithRating = {
  id: number
  name: string
  imageUrl: string | null
  platform: string | null
  entitlementId: string
  isActive: boolean | null
  topCriticAverage: number | null
  criticsRecommend: number | null
  tier: string | null
  url: string | null
  hasFailed: boolean
  errorMessage: string | null
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

export const columns: ColumnDef<GameWithRating>[] = [
  {
    accessorKey: 'imageUrl',
    header: '',
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
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-white transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="h-4 w-4" />
        </button>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="font-medium max-w-[300px] truncate">
          {row.getValue('name')}
        </div>
      )
    },
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    cell: ({ row }) => {
      const platform = row.getValue('platform') as string | null
      return platform ? (
        <Badge variant="outline" className="text-xs">
          {platform}
        </Badge>
      ) : (
        <span className="text-gray-500">-</span>
      )
    },
  },
  {
    accessorKey: 'topCriticAverage',
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-white transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Score
          <ArrowUpDown className="h-4 w-4" />
        </button>
      )
    },
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
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-white transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Recommend %
          <ArrowUpDown className="h-4 w-4" />
        </button>
      )
    },
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
    accessorKey: 'tier',
    header: ({ column }) => {
      return (
        <button
          className="flex items-center gap-1 hover:text-white transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Tier
          <ArrowUpDown className="h-4 w-4" />
        </button>
      )
    },
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
    header: 'OpenCritic',
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
    cell: ({ row }) => {
      const hasFailed = row.getValue('hasFailed') as boolean
      const errorMessage = row.original.errorMessage

      if (hasFailed) {
        return (
          <div className="flex flex-col">
            <Badge variant="destructive">Failed</Badge>
            {errorMessage && (
              <span className="text-xs text-red-400 mt-1 max-w-[150px] truncate">
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
