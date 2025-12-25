import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { purchasedGames, gameRatings, failedScrapes } from '@/db/schema'
import { desc, eq, isNull, isNotNull } from 'drizzle-orm'
import { DataTable } from '@/components/games/data-table'
import { columns, type GameWithRating } from '@/components/games/columns'
import { Gamepad2 } from 'lucide-react'

const getGamesWithRatings = createServerFn({
  method: 'GET',
}).handler(async () => {
  // Get all purchased games with their ratings
  const games = await db
    .select({
      id: purchasedGames.id,
      name: purchasedGames.name,
      imageUrl: purchasedGames.imageUrl,
      platform: purchasedGames.platform,
      entitlementId: purchasedGames.entitlementId,
      isActive: purchasedGames.isActive,
    })
    .from(purchasedGames)
    .orderBy(desc(purchasedGames.name))

  // Get ratings for games that have them
  const ratings = await db
    .select({
      entitlementId: gameRatings.entitlementId,
      topCriticAverage: gameRatings.topCriticAverage,
      criticsRecommend: gameRatings.criticsRecommend,
      playerRating: gameRatings.playerRating,
      tier: gameRatings.tier,
      url: gameRatings.url,
    })
    .from(gameRatings)

  // Get failed scrapes
  const failures = await db
    .select({
      entitlementId: failedScrapes.entitlementId,
      errorMessage: failedScrapes.errorMessage,
    })
    .from(failedScrapes)

  // Create lookup maps
  const ratingsMap = new Map(ratings.map((r) => [r.entitlementId, r]))
  const failuresMap = new Map(failures.map((f) => [f.entitlementId, f]))

  // Combine data
  const gamesWithRatings: GameWithRating[] = games.map((game) => {
    const rating = ratingsMap.get(game.entitlementId)
    const failure = failuresMap.get(game.entitlementId)

    return {
      id: game.id,
      name: game.name,
      imageUrl: game.imageUrl,
      platform: game.platform,
      entitlementId: game.entitlementId,
      isActive: game.isActive,
      topCriticAverage: rating?.topCriticAverage ?? null,
      criticsRecommend: rating?.criticsRecommend ?? null,
      playerRating: rating?.playerRating ?? null,
      tier: rating?.tier ?? null,
      url: rating?.url ?? null,
      hasFailed: !!failure,
      errorMessage: failure?.errorMessage ?? null,
    }
  })

  return gamesWithRatings
})

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => await getGamesWithRatings(),
})

function App() {
  const games = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Gamepad2 className="w-10 h-10 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Game Backlog</h1>
              <p className="text-gray-400">
                Decide what to play next based on OpenCritic ratings
              </p>
            </div>
          </div>

          <DataTable columns={columns} data={games} />
        </div>
      </section>
    </div>
  )
}
