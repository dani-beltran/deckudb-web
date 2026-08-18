import type { $Fetch, NitroFetchOptions } from 'nitropack/types'
import { ApiError } from './ApiError'
import { throwApiError } from './errorHelpers'

/**
 * BackendApi is a client for interacting with the backend API endpoints.
 * This endpoints does not require authentication and are accessible to all users.
 */
export class BackendApi {
  constructor(private readonly api: $Fetch) {}

  async fetchGame(gameId: string | number) {
    if (!gameId) throw new ApiError('Game ID is required')
    return this.request(`/games/${encodeURIComponent(gameId)}`)
  }

  async fetchSteamGame(gameId: string | number) {
    if (!gameId) throw new ApiError('Game ID is required')
    return this.request(`/steam/games/${encodeURIComponent(gameId)}`)
  }

  searchSteamGamesByName(term: string, limit = 10) {
    if (!term) throw new ApiError('Search term is required')
    return this.request('/steam/games', { query: { term, limit } })
  }

  async fetchSteamGamesByIds(gameIds: Array<string | number>) {
    if (gameIds.length === 0) throw new ApiError('At least one game ID is required')
    return this.request('/steam/games/batch', { query: { ids: gameIds.join(',') } })
  }

  async fetchMostPlayedGames(page = 1, pageSize = 20) {
    return this.request('/steam/most-played-steam-deck-games', {
      query: { page, page_size: pageSize },
    })
  }

  async submitGameSummaryVote(gameId: string | number, voteType: string) {
    if (!gameId) throw new ApiError('Game ID is required to submit a summary vote')
    if (!['up', 'down'].includes(voteType)) {
      throw new ApiError('Invalid vote type. Must be "up" or "down"')
    }

    await this.request(`/games/${encodeURIComponent(gameId)}/summary-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { vote_type: voteType },
    })
  }

  private async request<T = unknown>(
    url: string,
    init: NitroFetchOptions<string> = {}
  ): Promise<T> {
    try {
      return (await this.api<T, string>(url, init)) as T
    } catch (error) {
      throwApiError(error)
    }
  }
}
