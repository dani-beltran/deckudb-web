import { createHash } from 'node:crypto'
import { type Db, ObjectId, type WithId } from 'mongodb'
import type { SCRAPE_SOURCES } from '../game-sources/game-sources.schema.js'
import type { InputScrape, Scrape } from './scrapes.schema'

const collection = 'scrapes'

export class ScrapesModel {
  constructor(private readonly db: Db) {}

  saveScrapeData = async (data: InputScrape): Promise<WithId<Scrape>> => {
    const utcNow = new Date(Date.now())

    // Generate hash from scraped_content to ensure data integrity
    const contentString = JSON.stringify(data.scraped_content)
    const hash = createHash('sha256').update(contentString).digest('hex')

    // If a record with same hash exists, overwrite it to avoid duplicates of same scraped data
    const results = await this.db.collection<Scrape>(collection).findOneAndUpdate(
      { game_id: data.game_id, source: data.source, hash },
      {
        $set: {
          ...data,
          created_at: utcNow,
          hash,
        },
      },
      { upsert: true, returnDocument: 'after' }
    )

    if (!results?._id) {
      throw new Error('Failed to save scrape data')
    }

    return results
  }

  getScrapeDataById = async (id: string) => {
    return await this.db.collection<Scrape>(collection).findOne({ _id: new ObjectId(id) })
  }

  getScrapes = async (game_id: number, source?: SCRAPE_SOURCES) => {
    const query = source ? { source } : {}
    return await this.db
      .collection<Scrape>(collection)
      .find({ game_id, ...query })
      .sort({ created_at: -1 })
      .toArray()
  }

  /**
   * Fetches the most recent scrape for each unique URL for a given game and source.
   * This ensures we get the latest scrape data without duplicates for the same URL.
   */
  getLastScrapedData = async (game_id: number, source: SCRAPE_SOURCES): Promise<Scrape[]> => {
    return await this.db
      .collection<Scrape>(collection)
      .aggregate<Scrape>([
        { $match: { game_id, source } },
        { $sort: { created_at: -1 } },
        { $group: { _id: '$scraped_content.url', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } },
      ])
      .toArray()
  }

  /**
   * Only for testing purposes - directly inserts scrapes without hashing or upsert logic.
   */
  insertTestScrapes = async (scrapes: Scrape[]) => {
    await this.db.collection<Scrape>(collection).insertMany(scrapes)
    return scrapes
  }

  createScrapeIndexes = async () => {
    // Create compound index for game_id, source, and hash (used in updateOne upsert)
    await this.db
      .collection<Scrape>(collection)
      .createIndex({ game_id: 1, source: 1, hash: 1 }, { unique: true })

    // Create compound index for game_id and source with created_at for sorting
    // This supports the getLastScrapedData query efficiently
    await this.db
      .collection<Scrape>(collection)
      .createIndex({ game_id: 1, source: 1, created_at: -1 })
  }
}
