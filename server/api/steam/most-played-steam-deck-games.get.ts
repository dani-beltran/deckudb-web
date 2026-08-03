import { defineEventHandler } from 'h3'
import { mapGamesToSearchItems } from '../../backend/services/steam/steam'
import { apiHandler, parseQuery, useApiDependencies } from '../../utils/api'
import { paginationSchema } from '../../utils/pagination'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    const { page, page_size } = await parseQuery(event, paginationSchema)
    const { repositories } = await useApiDependencies()
    const ids = (await repositories.steamCache.getMostPlayedSteamDeckGameIds()) ?? []
    const offset = (page - 1) * page_size
    const games = await repositories.steamCache.getGamesDetails(
      ids.slice(offset, offset + page_size)
    )
    return { items: mapGamesToSearchItems(games), total: ids.length }
  })
)
