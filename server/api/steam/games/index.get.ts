import { defineEventHandler } from 'h3'
import z from 'zod'
import type { SteamSearch } from '../../../services/steam/steam.types'
import { apiHandler, parseQuery } from '../../../utils/api'

export type SteamGamesResponse = SteamSearch

const steamSearchQuerySchema = z.object({
  term: z.string().min(1, 'Search term is required'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export default defineEventHandler((event) =>
  apiHandler<SteamGamesResponse>(event, async () => {
    const { term, limit } = await parseQuery(event, steamSearchQuerySchema)
    const { repositories } = event.context
    return repositories.steamCache.getSearchResults(term, limit)
  })
)
