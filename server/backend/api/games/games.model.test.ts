import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { clearTestDB, closeTestDB, connectTestDB, getTestDB } from '../../lib/test-setup/test-db'
import { GamesModel } from '../games/games.model'
import { type Game, type GameInput, STEAMDECK_RATING } from '../games/games.schema'

let gamesModel: GamesModel

const makeGame = (overrides: Partial<Game> = {}): Game => ({
  game_id: 1,
  game_performance_summary: 'Runs great',
  steamdeck_rating: STEAMDECK_RATING.GOLD,
  steamdeck_verified: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
})

describe('games.model', () => {
  beforeAll(async () => {
    await connectTestDB()
    gamesModel = new GamesModel(getTestDB())
  })

  afterAll(async () => {
    await closeTestDB()
  })

  afterEach(async () => {
    await clearTestDB()
  })

  describe('fetchGameById', () => {
    it('returns a game when it exists', async () => {
      await gamesModel.insertTestGames([makeGame({ game_id: 100 })])

      const game = await gamesModel.fetchGameById(100)

      expect(game).not.toBeNull()
      expect(game?.game_id).toBe(100)
    })

    it('returns null when game does not exist', async () => {
      const game = await gamesModel.fetchGameById(9999)

      expect(game).toBeNull()
    })
  })

  describe('saveGame', () => {
    it('upserts a new game with timestamps', async () => {
      const payload: GameInput = {
        game_performance_summary: 'Excellent',
        steamdeck_rating: STEAMDECK_RATING.PLATINUM,
        steamdeck_verified: true,
      }

      await gamesModel.saveGame(200, payload)
      const stored = await gamesModel.fetchGameById(200)

      expect(stored).not.toBeNull()
      expect(stored?.game_id).toBe(200)
      expect(stored?.game_performance_summary).toBe('Excellent')
      expect(stored?.steamdeck_rating).toBe(STEAMDECK_RATING.PLATINUM)
      expect(stored?.created_at).toBeInstanceOf(Date)
      expect(stored?.updated_at).toBeInstanceOf(Date)
      expect(stored?.generated_at).toBeInstanceOf(Date)
    })

    it('updates an existing game and preserves created_at', async () => {
      await gamesModel.saveGame(201, {
        game_performance_summary: 'Initial',
        steamdeck_rating: STEAMDECK_RATING.SILVER,
      })
      const first = await gamesModel.fetchGameById(201)

      await gamesModel.saveGame(201, {
        game_performance_summary: 'Updated summary',
        steamdeck_rating: STEAMDECK_RATING.GOLD,
      })
      const updated = await gamesModel.fetchGameById(201)

      expect(first).not.toBeNull()
      expect(updated).not.toBeNull()
      expect(updated?.game_performance_summary).toBe('Updated summary')
      expect(updated?.steamdeck_rating).toBe(STEAMDECK_RATING.GOLD)
      expect(updated?.created_at).toEqual(first?.created_at)
      expect(updated?.updated_at.getTime()).toBeGreaterThanOrEqual(first?.updated_at.getTime() ?? 0)
    })

    it('throws for invalid game payload', async () => {
      await expect(
        gamesModel.saveGame(202, {
          steamdeck_rating: 'invalid-rating' as STEAMDECK_RATING,
        })
      ).rejects.toThrow()
    })
  })

  describe('insertTestGames', () => {
    it('inserts all provided games', async () => {
      await gamesModel.insertTestGames([
        makeGame({ game_id: 301 }),
        makeGame({ game_id: 302 }),
        makeGame({ game_id: 303 }),
      ])

      const [a, b, c] = await Promise.all([
        gamesModel.fetchGameById(301),
        gamesModel.fetchGameById(302),
        gamesModel.fetchGameById(303),
      ])

      expect(a?.game_id).toBe(301)
      expect(b?.game_id).toBe(302)
      expect(c?.game_id).toBe(303)
    })
  })

  describe('createGameIndexes', () => {
    it('creates a unique index on game_id', async () => {
      await gamesModel.createGameIndexes()
      const db = getTestDB()

      const indexes = await db.collection('games').indexes()
      expect(indexes.some((idx) => idx.name === 'game_id_1' && idx.unique)).toBe(true)
    })
  })
})
