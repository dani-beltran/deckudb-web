import type { Collection, Db } from 'mongodb'
import {
  getMostPlayedSteamDeckGameIds,
  getSteamGameDetails,
  searchSteamGames,
} from '../services/steam/steam'
import type { SteamApp, SteamSearch } from '../services/steam/steam.types'
import type { Repository } from '../utils/bootstrap'
import { NotFoundError } from '../utils/errors/NotFoundError'
import type {
  SteamDeckMostPlayedCache,
  SteamGameDetailsCache,
  SteamSearchCache,
} from './steam-cache.schema'

// Cache duration: 1 day (1 day in milliseconds)
export const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * Repository for caching Steam search results and game details.
 *
 * It's important to cache since Steam has rate limits and can block requests if too many are made in a short period of time.
 * It can even block the server's IP address for a period of time, which can cause issues for users trying to access the application.
 *
 * There are three collections in the database for caching:
 * 1. `steam_search_cache`: Caches search results for Steam games based on search term and limit.
 * 2. `steam_details_cache`: Caches detailed information about specific Steam games based on game ID.
 * 3. `steam_deck_most_played_cache`: Caches the most played games on Steam Deck.
 *
 * Each collection has a TTL index to automatically remove expired documents.
 */
export class SteamCacheModel implements Repository {
  private searchCacheCollection: Collection<SteamSearchCache>
  private detailsCacheCollection: Collection<SteamGameDetailsCache>
  private mostPlayedCacheCollection: Collection<SteamDeckMostPlayedCache>

  constructor(private readonly db: Db) {
    this.searchCacheCollection = this.db.collection<SteamSearchCache>('steam_search_cache')
    this.detailsCacheCollection = this.db.collection<SteamGameDetailsCache>('steam_details_cache')
    this.mostPlayedCacheCollection = this.db.collection<SteamDeckMostPlayedCache>(
      'steam_deck_most_played_cache'
    )
  }

  /**
   * Try to get search results from cache, if not found or expired, fetch from Steam and cache the results
   */
  async getSearchResults(term: string, limit: number) {
    const cached = await this.getCachedSearchResults(term, limit)
    if (cached) {
      return cached
    }
    const results = await searchSteamGames(term, limit)
    await this.cacheSearchResults(term, limit, results)
    return results
  }

  /**
   * Try to get game details from cache, if not found or expired, fetch from Steam and cache the results
   * @throws NotFoundError if the game is not found in Steam
   */
  async getGameDetails(gameId: number) {
    const cached = await this.getCachedGameDetails(gameId)
    if (cached) {
      return cached
    }
    const results = await getSteamGameDetails(gameId).catch((error) => {
      throw new NotFoundError(`Game with ID ${gameId} not found in Steam: ${error.message}`)
    })
    await this.cacheGameDetails(gameId, results)
    return results
  }

  async getGamesDetails(gameIds: number[]) {
    const cached = await this.getCachedGamesDetails(gameIds)
    const cachedGameIds = new Set(cached.map((game) => game.steam_appid))
    const missingGameIds = gameIds.filter((id) => !cachedGameIds.has(id))

    if (missingGameIds.length === 0) {
      return cached
    }

    const fetchedDetails = await Promise.all(missingGameIds.map((id) => getSteamGameDetails(id)))

    await Promise.all(
      fetchedDetails.map((details) => this.cacheGameDetails(details.steam_appid, details))
    )

    return [...cached, ...fetchedDetails]
  }

  async getMostPlayedSteamDeckGameIds() {
    const cached = await this.getCachedMostPlayedGamesIds()
    if (cached?.length) {
      return cached
    }
    const results = await getMostPlayedSteamDeckGameIds()
    await this.cacheMostPlayedGamesIds(results)
    return results
  }

  private getCachedSearchResults = async (term: string, limit: number) => {
    const now = new Date()

    const cached = await this.searchCacheCollection.findOne({
      term,
      limit,
      expires_at: { $gt: now },
    })

    return cached?.data || null
  }

  private cacheSearchResults = async (term: string, limit: number, data: SteamSearch) => {
    const now = new Date()
    const expires_at = new Date(now.getTime() + CACHE_DURATION_MS)

    await this.searchCacheCollection.updateOne(
      { term, limit },
      {
        $set: {
          data,
          created_at: now,
          expires_at,
        },
      },
      { upsert: true }
    )
  }

  private getCachedGameDetails = async (gameId: number) => {
    const now = new Date()

    const cached = await this.detailsCacheCollection.findOne({
      game_id: gameId,
      expires_at: { $gt: now },
    })

    return cached?.data || null
  }

  private getCachedGamesDetails = async (gameIds: number[]) => {
    const now = new Date()

    const cachedCursor = await this.detailsCacheCollection.find({
      game_id: { $in: gameIds },
      expires_at: { $gt: now },
    })
    return (await cachedCursor.toArray()).map((doc) => doc.data)
  }

  private cacheGameDetails = async (gameId: number, data: SteamApp) => {
    const now = new Date()
    const expires_at = new Date(now.getTime() + CACHE_DURATION_MS)

    const results = await this.detailsCacheCollection.updateOne(
      { game_id: gameId },
      {
        $set: {
          data,
          created_at: now,
          expires_at,
        },
      },
      { upsert: true }
    )

    if (results.modifiedCount === 0 && results.upsertedCount === 0) {
      throw new Error(`Failed to cache game details for game ID: ${gameId}`)
    }
  }

  /**
   * Get cached Steam Deck most played games
   */
  private getCachedMostPlayedGamesIds = async () => {
    const now = new Date()

    const cached = await this.mostPlayedCacheCollection.findOne({
      expires_at: { $gt: now },
    })

    return cached?.game_ids || null
  }

  /**
   * Save Steam Deck most played games to cache
   */
  private cacheMostPlayedGamesIds = async (gameIds: number[]) => {
    const now = new Date()
    const expires_at = new Date(now.getTime() + CACHE_DURATION_MS)

    await this.mostPlayedCacheCollection.updateOne(
      {},
      {
        $set: {
          game_ids: gameIds,
          created_at: now,
          expires_at,
        },
      },
      { upsert: true }
    )
  }

  /**
   * Create indexes for cache collections (call this on app startup)
   */
  createIndexes = async () => {
    // Create TTL index on search cache
    await this.searchCacheCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

    // Create compound index for search queries
    await this.searchCacheCollection.createIndex({ term: 1, limit: 1 })

    // Create TTL index on details cache
    await this.detailsCacheCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

    // Create index on game_id
    await this.detailsCacheCollection.createIndex({ game_id: 1 })

    // Create TTL index on most played cache
    await this.mostPlayedCacheCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
  }
}
