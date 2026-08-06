import { type Db, MongoBulkWriteError, type WithId } from 'mongodb'
import { type GameSource, type GameSourceCreate, SCRAPE_SOURCES } from './game-sources.schema'
import type { Repository } from '../utils/bootstrap'

const collection = 'game-sources'

export class GameSourcesModel implements Repository {
  constructor(private readonly db: Db) {}

  saveGameSources = async (sources: GameSourceCreate[]): Promise<{ count: number }> => {
    if (sources.length === 0) {
      return { count: 0 }
    }

    try {
      const results = await this.db.collection<GameSource>(collection).insertMany(
        sources.map((source) => ({
          ...source,
          created_at: new Date(),
          updated_at: new Date(),
        })),
        { ordered: false }
      )
      return { count: results?.insertedCount ?? 0 }
    } catch (err) {
      // Handle duplicate key errors (E11000) which occur when trying to insert a source that already exists for the same game_id and url.
      if (err instanceof MongoBulkWriteError && err.code === 11000) {
        return { count: err.results?.insertedCount ?? 0 }
      }
      throw err
    }
  }

  getGameSourcesByGameId = async (game_id: number): Promise<WithId<GameSource>[]> => {
    return await this.db.collection<GameSource>(collection).find({ game_id }).toArray()
  }

  getAllGameSources = async (pagination: { skip: number; limit: number }) => {
    return await this.db
      .collection<GameSource>(collection)
      .find({})
      .skip(pagination.skip)
      .limit(pagination.limit)
      .toArray()
  }

  deleteGameSourcesByGameId = async (game_id: number) => {
    await this.db.collection<GameSource>(collection).deleteMany({ game_id })
  }

  createIndexes = async () => {
    await this.db.collection(collection).createIndex({ game_id: 1, url: 1 }, { unique: true })
  }
}

/**
 * Determines the source type based on the URL hostname.
 * If the hostname contains a known source name, it returns that source; otherwise, it returns "other".
 */
export const getSourceFromUrl = (url: string): SCRAPE_SOURCES => {
  const hostname = new URL(url).hostname
  const sourceNames = Object.values(SCRAPE_SOURCES)
  const sourceEntry = sourceNames.find((source) => hostname.includes(source.toLowerCase()))
  return sourceEntry ?? SCRAPE_SOURCES.OTHER
}
