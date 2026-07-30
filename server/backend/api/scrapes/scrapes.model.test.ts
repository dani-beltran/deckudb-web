import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { clearTestDB, closeTestDB, connectTestDB, getTestDB } from '../../lib/test-setup/test-db'
import { SCRAPE_SOURCES } from '../game-sources/game-sources.schema'
import { ScrapesModel } from './scrapes.model'
import type { InputScrape } from './scrapes.schema'

let scrapesModel: ScrapesModel

const gameId = 1091500
const makeInputScrape = (overrides: Partial<InputScrape> = {}): InputScrape => ({
  game_id: gameId,
  source: SCRAPE_SOURCES.PROTONDB,
  scraped_content: {
    title: 'ProtonDB',
    url: 'https://www.protondb.com/app/1091500',
    sections: [],
  },
  ...overrides,
})

describe('scrapes.model', () => {
  beforeAll(async () => {
    await connectTestDB()
    scrapesModel = new ScrapesModel(getTestDB())
  })

  afterEach(async () => {
    await clearTestDB()
  })

  afterAll(async () => {
    await closeTestDB()
  })

  describe('saveScrapeData', () => {
    it('stores scrape data with a generated hash', async () => {
      const scrape = await scrapesModel.saveScrapeData(makeInputScrape())

      const stored = await scrapesModel.getScrapeDataById(scrape._id.toString())
      expect(stored).not.toBeNull()
      expect(stored?.hash).toMatch(/^[a-f0-9]{64}$/)
      expect(stored?.created_at).toBeInstanceOf(Date)
    })

    it('upserts same game/source/content instead of duplicating', async () => {
      const payload = makeInputScrape()

      await scrapesModel.saveScrapeData(payload)
      await scrapesModel.saveScrapeData(payload)

      const docs = await scrapesModel.getScrapes(gameId)
      expect(docs).toHaveLength(1)
    })

    it('creates another row when scraped content changes', async () => {
      await scrapesModel.saveScrapeData(makeInputScrape())
      await scrapesModel.saveScrapeData(
        makeInputScrape({
          scraped_content: {
            title: 'ProtonDB Updated',
            url: 'https://www.protondb.com/app/1091500',
            sections: [],
          },
        })
      )

      const docs = await scrapesModel.getScrapes(gameId, SCRAPE_SOURCES.PROTONDB)
      expect(docs).toHaveLength(2)
    })
  })

  describe('getLastScrapedData', () => {
    it('returns latest scrape by created_at for game and source', async () => {
      await scrapesModel.insertTestScrapes([
        {
          ...makeInputScrape({
            source: SCRAPE_SOURCES.PROTONDB,
          }),
          hash: 'h1',
          created_at: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          ...makeInputScrape({
            source: SCRAPE_SOURCES.PROTONDB,
          }),
          hash: 'h2',
          created_at: new Date('2024-02-01T00:00:00.000Z'),
        },
        {
          ...makeInputScrape({
            source: SCRAPE_SOURCES.OTHER,
          }),
          hash: 'h3',
          created_at: new Date('2024-03-01T00:00:00.000Z'),
        },
      ])

      const scrapes = await scrapesModel.getLastScrapedData(1091500, SCRAPE_SOURCES.PROTONDB)
      const last = scrapes[0]

      expect(scrapes).toHaveLength(1)
      expect(last).not.toBeNull()
      expect(last?.hash).toBe('h2')
    })

    it('returns empty array when no scrape exists for game and source', async () => {
      const last = await scrapesModel.getLastScrapedData(9999, SCRAPE_SOURCES.SHAREDECK)
      expect(last).toEqual([])
    })
  })

  describe('createScrapeIndexes', () => {
    it('creates expected compound indexes', async () => {
      await scrapesModel.createScrapeIndexes()

      const indexes = await getTestDB().collection('scrapes').indexes()

      expect(
        indexes.some((index) => index.name === 'game_id_1_source_1_hash_1' && index.unique === true)
      ).toBe(true)
      expect(indexes.some((index) => index.name === 'game_id_1_source_1_created_at_-1')).toBe(true)
    })
  })
})
