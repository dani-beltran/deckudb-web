import type { Request, Response } from 'express'
import { NotFoundError } from '../../errors/NotFoundError'
import { createController } from '../../lib/controller-factory'
import type { PaginationParams } from '../../lib/pagination.js'
import { mapGamesToSearchItems } from '../../services/steam/steam.js'
import type { SteamApp, SteamSearch } from '../../services/steam/steam.types'
import type { AppDependencies } from '../../types/dependencies'
import type { SteamGameIdParam, SteamGameIdsQuery, SteamSearchQuery } from './steam.router'

export const createSteamControllers = ({ repositories }: AppDependencies) => {
  const searchSteamGamesRequestHandler = async (
    req: Request,
    _res: Response
  ): Promise<SteamSearch> => {
    const { term, limit } = req.query as unknown as SteamSearchQuery
    return repositories.steamCache.getSearchResults(term, limit)
  }

  const getSteamGameDetailsRequestHandler = async (
    req: Request,
    _res: Response
  ): Promise<SteamApp> => {
    const { id: gameId } = req.params as unknown as SteamGameIdParam
    return repositories.steamCache.getGameDetails(gameId).catch(() => {
      throw new NotFoundError('Game not found on Steam')
    })
  }

  const getMostPlayedSteamDeckGamesRequestHandler = async (
    req: Request,
    _res: Response
  ): Promise<SteamSearch> => {
    const { page, page_size } = req.query as unknown as PaginationParams

    // Calculate offset based on page number
    const offset = (page - 1) * page_size
    const limit = offset + page_size

    const ids = (await repositories.steamCache.getMostPlayedSteamDeckGameIds()) ?? []
    const games = await repositories.steamCache.getGamesDetails(ids.slice(offset, limit))
    const results: SteamSearch = {
      items: mapGamesToSearchItems(games),
      total: ids.length,
    }
    return results
  }

  const getManySteamGamesDetailsRequestHandler = async (
    req: Request,
    _res: Response
  ): Promise<SteamSearch> => {
    const { ids: gameIds } = req.query as unknown as SteamGameIdsQuery
    const games = await repositories.steamCache.getGamesDetails(gameIds)
    return {
      items: mapGamesToSearchItems(games),
      total: games.length,
    }
  }

  return {
    searchSteamGamesCtrl: createController(searchSteamGamesRequestHandler),
    getSteamGameDetailsCtrl: createController(getSteamGameDetailsRequestHandler),
    getMostPlayedSteamDeckGamesCtrl: createController(getMostPlayedSteamDeckGamesRequestHandler),
    getManySteamGamesDetailsCtrl: createController(getManySteamGamesDetailsRequestHandler),
  }
}
