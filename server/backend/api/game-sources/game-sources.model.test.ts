import type { WithId } from 'mongodb'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { clearTestDB, closeTestDB, connectTestDB, getTestDB } from '../../lib/test-setup/test-db'
import { GameSourcesModel } from './game-sources.model'
import { type GameSource, SCRAPE_SOURCES } from './game-sources.schema'

let gameSourcesModel: GameSourcesModel

const makeSources = () => [
  {
    game_id: 1091500,
    url: 'https://www.protondb.com/app/1091500',
    source: SCRAPE_SOURCES.PROTONDB,
    meta: {},
  },
  {
    game_id: 1091500,
    url: 'https://example.com/custom-source',
    source: SCRAPE_SOURCES.OTHER,
    meta: {},
  },
]

describe('sources.model', () => {
  beforeAll(async () => {
    await connectTestDB()
    gameSourcesModel = new GameSourcesModel(getTestDB())
    await gameSourcesModel.createGameSourceIndexes()
  })

  afterAll(async () => {
    await closeTestDB()
  })

  afterEach(async () => {
    await clearTestDB()
  })

  describe('getGameSourcesByGameId', () => {
    it('returns sources for an existing game', async () => {
      await gameSourcesModel.saveGameSources(makeSources())

      const findings: WithId<GameSource>[] = await gameSourcesModel.getGameSourcesByGameId(1091500)

      expect(findings.length).toBe(2)
      expect(findings[0].game_id).toBe(1091500)
    })

    it('returns an empty array when game has no sources', async () => {
      const found = await gameSourcesModel.getGameSourcesByGameId(9999)
      expect(found).toHaveLength(0)
    })
  })

  describe('saveGameSources', () => {
    it('inserts sources and returns inserted ids', async () => {
      const sources = makeSources()

      const { count } = await gameSourcesModel.saveGameSources(sources)

      expect(count).toBe(sources.length)
    })

    it('handles duplicate key errors and inserts only new sources', async () => {
      await gameSourcesModel.saveGameSources([
        {
          game_id: 1091500,
          url: 'https://www.protondb.com/app/1091500', // duplicate
          source: SCRAPE_SOURCES.PROTONDB,
          meta: {},
        },
      ])

      const mixed = [
        {
          game_id: 1091500,
          url: 'https://www.protondb.com/app/1091500', // duplicate
          source: SCRAPE_SOURCES.PROTONDB,
          meta: {},
        },
        {
          game_id: 1091500,
          url: 'https://steamdeckhq.com/game-reviews/cyberpunk/',
          source: SCRAPE_SOURCES.OTHER,
          meta: {},
        },
      ]

      await expect(gameSourcesModel.saveGameSources(mixed)).resolves.not.toThrow()

      const all = await gameSourcesModel.getGameSourcesByGameId(1091500)
      expect(all.length).toBe(2)
    })

    it('throws when the database does not return inserted ids', async () => {
      const faultyModel = new GameSourcesModel({
        collection: () => ({
          insertMany: () => Promise.resolve({}),
        }),
      } as unknown as ReturnType<typeof getTestDB>)

      await expect(faultyModel.saveGameSources(makeSources())).resolves.toEqual({
        count: 0,
      })
    })
  })

  describe('getAllGameSources', () => {
    it('returns all source documents', async () => {
      await gameSourcesModel.saveGameSources([
        {
          game_id: 1,
          url: 'https://www.protondb.com/app/1',
          source: SCRAPE_SOURCES.PROTONDB,
          meta: {},
        },
      ])
      await gameSourcesModel.saveGameSources([
        {
          game_id: 2,
          url: 'https://www.sharedeck.games/apps/570',
          source: SCRAPE_SOURCES.OTHER,
          meta: {},
        },
      ])

      const all = await gameSourcesModel.getAllGameSources({
        skip: 0,
        limit: 100,
      })

      expect(all).toHaveLength(2)
      expect(
        all.map((doc: WithId<GameSource>) => doc.game_id).sort((a: number, b: number) => a - b)
      ).toEqual([1, 2])
    })
  })

  describe('deleteGameSourcesByGameId', () => {
    it('deletes sources for a specific game only', async () => {
      await gameSourcesModel.saveGameSources([
        {
          game_id: 10,
          url: 'https://www.protondb.com/app/10',
          source: SCRAPE_SOURCES.PROTONDB,
          meta: {},
        },
      ])
      await gameSourcesModel.saveGameSources([
        {
          game_id: 11,
          url: 'https://www.protondb.com/app/11',
          source: SCRAPE_SOURCES.PROTONDB,
          meta: {},
        },
      ])

      await gameSourcesModel.deleteGameSourcesByGameId(10)

      expect(await gameSourcesModel.getGameSourcesByGameId(10)).toHaveLength(0)
      expect(await gameSourcesModel.getGameSourcesByGameId(11)).toHaveLength(1)
    })
  })
})
