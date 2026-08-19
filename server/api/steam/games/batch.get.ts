import { defineEventHandler } from 'h3'
import z from 'zod'
import { gameIdSchema } from '../../../models/games.schema'
import { mapGamesToSearchItems } from '../../../services/steam/steam'
import type { SteamSearch } from '../../../services/steam/steam.types'
import { apiHandler, parseQuery } from '../../../utils/api'

export type SteamGamesBatchResponse = SteamSearch

const gameIdsQuerySchema = z.object({
  ids: z
    .string()
    .min(1, 'At least one game ID is required')
    .transform((value, context) => {
      const ids: number[] = []
      for (const valuePart of value.split(',')) {
        const result = gameIdSchema.safeParse(valuePart)
        if (!result.success) {
          context.addIssue(result.error.issues[0]?.message ?? 'Invalid game ID')
          return z.NEVER
        }
        ids.push(result.data)
      }
      return ids
    }),
})

export default defineEventHandler((event) =>
  apiHandler<SteamGamesBatchResponse>(event, async () => {
    const { ids } = await parseQuery(event, gameIdsQuerySchema)
    const { repositories } = event.context
    const games = await repositories.steamCache.getGamesDetails(ids)
    return { items: mapGamesToSearchItems(games), total: games.length }
  })
)
