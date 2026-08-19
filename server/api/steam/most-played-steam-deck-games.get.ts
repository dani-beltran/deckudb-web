import { defineEventHandler } from 'h3'
import { mapGamesToSearchItems } from '../../services/steam/steam'
import type { SteamSearch } from '../../services/steam/steam.types'
import { apiHandler, parseQuery } from '../../utils/api'
import { paginationSchema } from '../../utils/pagination'

export type MostPlayedSteamDeckGamesResponse = SteamSearch

export default defineEventHandler((event) =>
  apiHandler<MostPlayedSteamDeckGamesResponse>(event, async () => {
    const { page, page_size } = await parseQuery(event, paginationSchema)
    const { repositories } = event.context
    const ids = (await repositories.steamCache.getMostPlayedSteamDeckGameIds()) ?? []
    const offset = (page - 1) * page_size
    const games = await repositories.steamCache.getGamesDetails(
      ids.slice(offset, offset + page_size)
    )
    return { items: mapGamesToSearchItems(games), total: ids.length }
  })
)
