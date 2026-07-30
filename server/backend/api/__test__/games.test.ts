import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app'
import { clearTestDB, closeTestDB, connectTestDB } from '../../lib/test-setup/test-db'
import { createTestDependencies } from '../../lib/test-setup/test-dependencies'
import * as steamService from '../../services/steam/steam.js'
import { STEAMDECK_VERIFICATION_STATUS, type SteamApp } from '../../services/steam/steam.types'
import type { AppDependencies } from '../../types/dependencies'
import { SCRAPE_SOURCES } from '../game-sources/game-sources.schema.js'
import type { GameReport } from '../games/game-reports.schema'
import { type Game, STEAMDECK_HARDWARE, STEAMDECK_RATING } from '../games/games.schema'
import { JOB_STATUS, JOB_TYPE } from '../jobs/jobs.model'

// Mock steam service to avoid network calls in tests
vi.mock('../../services/steam/steam', () => ({
  getSteamGameDestails: vi.fn(),
}))

let dependencies: AppDependencies
let app: ReturnType<typeof createApp>
let jobsModel: AppDependencies['repositories']['jobs']
let gameModel: AppDependencies['repositories']['games']
let gameSummaryVotesModel: AppDependencies['repositories']['gameSummaryVotes']
let insertTestGameReports: AppDependencies['repositories']['gameReports']['insertTestGameReports']

describe('GET /games/:id', () => {
  beforeAll(async () => {
    await connectTestDB()
  })

  beforeEach(async () => {
    dependencies = createTestDependencies()
    app = createApp(dependencies)
    jobsModel = dependencies.repositories.jobs
    gameModel = dependencies.repositories.games
    gameSummaryVotesModel = dependencies.repositories.gameSummaryVotes
    insertTestGameReports = dependencies.repositories.gameReports.insertTestGameReports
    vi.mocked(steamService.getSteamGameDestails).mockResolvedValue({
      name: 'Mocked Steam Game',
      type: 'game',
    } as SteamApp)
  })

  afterAll(async () => {
    await closeTestDB()
  })

  afterEach(async () => {
    await clearTestDB()
  })

  describe('Successful scenarios', () => {
    it('should return a game when valid ID is provided', async () => {
      // Arrange
      const testGame: Game = {
        game_id: 1,
        game_performance_summary: 'Runs smoothly on Steam Deck',
        steamdeck_rating: STEAMDECK_RATING.GOLD,
        steamdeck_verified: true,
        steamdeck_verification_status: STEAMDECK_VERIFICATION_STATUS.VERIFIED,
        created_at: new Date(),
        updated_at: new Date(),
      }
      await gameModel.insertTestGames([testGame])

      const testGameReports: GameReport[] = [
        {
          game_id: 1,
          title: 'Great performance on LCD',
          game_settings: { graphics: 'High', resolution: '1920x1080' },
          steamdeck_settings: { tdp_limit: 15, frame_rate_cap: 60 },
          steamdeck_hardware: STEAMDECK_HARDWARE.LCD,
          source: SCRAPE_SOURCES.PROTONDB,
          url: 'https://protondb.com/report/1',
          reporter: {
            username: 'testuser',
            user_profile_url: 'https://protondb.com/user/testuser',
            user_profile_avatar_url: 'https://avatar.url/testuser.jpg',
          },
          notes: 'Works great with these settings',
          posted_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      await insertTestGameReports(testGameReports)

      // Act
      const response = await request(app).get('/games/1').expect('Content-Type', /json/).expect(200)

      // Assert
      expect(response.body.status).toBe('ready')
      expect(response.body.game).toMatchObject({
        game_id: 1,
        game_performance_summary: 'Runs smoothly on Steam Deck',
        steamdeck_rating: 'gold',
        steamdeck_verified: true,
        steamdeck_verification_status: 'Verified',
      })
      expect(response.body.game).toHaveProperty('_id')
      expect(response.body.game.reports).toBeInstanceOf(Array)
      expect(response.body.game.reports).toHaveLength(1)
    })

    it('should return a game with minimal data', async () => {
      // Arrange
      const testGame: Game = {
        game_id: 2,
        created_at: new Date(),
        updated_at: new Date(),
      }

      await gameModel.insertTestGames([testGame])

      // Act
      const response = await request(app).get('/games/2').expect('Content-Type', /json/).expect(200)

      // Assert
      expect(response.body.status).toBe('ready')
      expect(response.body.game).toMatchObject({
        game_id: 2,
      })
      expect(response.body.game.reports).toEqual([])
    })

    it('should return a game with complex reports', async () => {
      // Arrange
      const testGame: Game = {
        game_id: 3,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const testGameReports: GameReport[] = [
        {
          game_id: 3,
          title: 'Excellent on OLED',
          game_settings: {
            quality: 'Ultra',
            antiAliasing: 'TAA',
            vsync: 'yes',
          },
          steamdeck_settings: {
            frame_rate_cap: 60,
            screen_refresh_rate: 90,
            proton_version: '8.0',
          },
          steamdeck_hardware: STEAMDECK_HARDWARE.OLED,
          battery_performance: {
            consumption: '20W',
            temps: '65C',
            life_span: '2.5 hours',
          },
          steamdeck_experience: {
            average_frame_rate: 55,
          },
          source: SCRAPE_SOURCES.OTHER,
          url: 'https://steamdeckhq.com/report/3',
          reporter: {
            username: 'poweruser',
            user_profile_url: 'https://steamdeckhq.com/user/poweruser',
          },
          notes: 'Amazing performance with ultra settings on OLED',
          posted_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      await gameModel.insertTestGames([testGame])
      await insertTestGameReports(testGameReports)

      // Act
      const response = await request(app).get('/games/3').expect(200)

      // Assert
      expect(response.body.status).toBe('ready')
      expect(response.body.game.reports).toHaveLength(1)
      expect(response.body.game.reports[0]).toMatchObject({
        game_settings: testGameReports[0].game_settings,
        steamdeck_settings: testGameReports[0].steamdeck_settings,
        steamdeck_hardware: testGameReports[0].steamdeck_hardware,
        battery_performance: testGameReports[0].battery_performance,
        steamdeck_experience: testGameReports[0].steamdeck_experience,
      })
    })

    it('should return the correct game when multiple games exist', async () => {
      // Arrange
      const games = [
        {
          game_id: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          game_id: 2,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          game_id: 3,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      await gameModel.insertTestGames(games)

      // Act
      const response = await request(app).get('/games/2').expect(200)

      // Assert
      expect(response.body.status).toBe('ready')
      expect(response.body.game).toMatchObject({
        game_id: 2,
      })
    })
  })

  describe('Error scenarios', () => {
    it('should return 200 with queued status when game is not found', async () => {
      // Act
      const response = await request(app)
        .get('/games/999')
        .expect('Content-Type', /json/)
        .expect(200)

      // Assert
      expect(response.body.status).toBe('queued')
      expect(response.body.game).toMatchObject({
        game_id: 999,
      })
    })

    it('should return 400 for invalid ID format (non-numeric)', async () => {
      // Act
      const response = await request(app)
        .get('/games/abc')
        .expect('Content-Type', /json/)
        .expect(400)

      // Assert
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Invalid request parameters')
    })

    it('should return 400 for negative ID', async () => {
      // Act
      const response = await request(app)
        .get('/games/-1')
        .expect('Content-Type', /json/)
        .expect(400)

      // Assert
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Invalid request parameters')
    })

    it('should return 400 for zero ID', async () => {
      // Act
      const response = await request(app).get('/games/0').expect('Content-Type', /json/).expect(400)

      // Assert
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Invalid request parameters')
    })

    it('should return 400 for decimal ID', async () => {
      // Act
      const response = await request(app)
        .get('/games/1.5')
        .expect('Content-Type', /json/)
        .expect(400)

      // Assert
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Invalid request parameters')
    })

    it('should return 500 when database query fails', async () => {
      // Arrange - Mock the fetchGameById to throw an error
      const mockError = new Error('Database connection failed')
      vi.spyOn(gameModel, 'fetchGameById').mockRejectedValueOnce(mockError)

      // Act
      const response = await request(app).get('/games/1').expect('Content-Type', /json/).expect(500)

      // Assert
      expect(response.body).toEqual({
        error: 'Internal server error',
      })

      // Cleanup
      vi.restoreAllMocks()
    })
  })

  describe('Duplicate job prevention', () => {
    it('should not queue jobs when recent QUEUED jobs already exist for the game', async () => {
      // Arrange - pre-insert a QUEUED job for the game
      await jobsModel.insertTestJobs([
        {
          job_id: 'existing-queued-job',
          job_type: JOB_TYPE.FULL,
          game_id: 999,
          status: JOB_STATUS.QUEUED,
          started_at: null,
          completed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      const queueJobSpy = vi.spyOn(jobsModel, 'queueJob')

      // Act
      const response = await request(app)
        .get('/games/999')
        .expect('Content-Type', /json/)
        .expect(200)

      // Assert
      expect(response.body.status).toBe('queued')
      expect(queueJobSpy).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('should not queue jobs when recent IN_PROGRESS jobs already exist for the game', async () => {
      // Arrange - pre-insert an IN_PROGRESS job for the game
      await jobsModel.insertTestJobs([
        {
          job_id: 'existing-in-progress-job',
          job_type: JOB_TYPE.FULL,
          game_id: 999,
          status: JOB_STATUS.IN_PROGRESS,
          started_at: new Date(),
          completed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      const queueJobSpy = vi.spyOn(jobsModel, 'queueJob')

      // Act
      const response = await request(app)
        .get('/games/999')
        .expect('Content-Type', /json/)
        .expect(200)

      // Assert
      expect(response.body.status).toBe('queued')
      expect(queueJobSpy).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('should queue jobs on first visit when no pending jobs exist', async () => {
      // Arrange
      const queueJobSpy = vi.spyOn(jobsModel, 'queueJob')

      // Act
      const response = await request(app)
        .get('/games/999')
        .expect('Content-Type', /json/)
        .expect(200)

      // Assert - a full job is queued
      expect(response.body.status).toBe('queued')
      expect(queueJobSpy).toHaveBeenCalledTimes(1)
      expect(queueJobSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          job_type: JOB_TYPE.FULL,
          game_id: 999,
        })
      )
      vi.restoreAllMocks()
    })

    it('should not queue jobs when not an actual steam game', async () => {
      // Arrange
      const queueJobSpy = vi.spyOn(jobsModel, 'queueJob')
      vi.mocked(steamService.getSteamGameDestails).mockResolvedValue({
        name: 'Mocked Non-Game App',
        type: 'application',
      } as SteamApp)

      // Act
      const response = await request(app)
        .get('/games/999')
        .expect('Content-Type', /json/)
        .expect(200)

      // Assert - a full job is queued
      expect(response.body.status).toBe('invalid')
      expect(queueJobSpy).toHaveBeenCalledTimes(0)
      vi.restoreAllMocks()
    })
  })

  describe('Edge cases', () => {
    it('should handle very large game IDs', async () => {
      // Arrange
      const largeId = 2147483647 // Max 32-bit integer
      const testGame: Game = {
        game_id: largeId,
        created_at: new Date(),
        updated_at: new Date(),
      }

      await gameModel.insertTestGames([testGame])

      // Act
      const response = await request(app).get(`/games/${largeId}`).expect(200)

      // Assert
      expect(response.body.status).toBe('ready')
      expect(response.body.game.game_id).toBe(largeId)
    })

    it('should handle games with no reports', async () => {
      // Arrange
      const testGame: Game = {
        game_id: 4,
        created_at: new Date(),
        updated_at: new Date(),
      }

      await gameModel.insertTestGames([testGame])

      // Act
      const response = await request(app).get('/games/4').expect(200)

      // Assert
      expect(response.body.status).toBe('ready')
      expect(response.body.game.reports).toEqual([])
    })
  })
})

describe('POST /games/:id/summary-vote', () => {
  beforeAll(async () => {
    await connectTestDB()
  })

  beforeEach(async () => {
    dependencies = createTestDependencies()
    app = createApp(dependencies)
    jobsModel = dependencies.repositories.jobs
    gameModel = dependencies.repositories.games
    gameSummaryVotesModel = dependencies.repositories.gameSummaryVotes
    insertTestGameReports = dependencies.repositories.gameReports.insertTestGameReports
  })

  afterAll(async () => {
    await closeTestDB()
  })

  afterEach(async () => {
    await clearTestDB()
  })

  it('should record an up vote and return a success message', async () => {
    const response = await request(app)
      .post('/games/10/summary-vote')
      .send({ vote_type: 'up' })
      .expect('Content-Type', /json/)
      .expect(200)

    expect(response.body).toEqual({
      message: "Vote 'up' recorded for game ID 10",
    })

    const voteScore = await gameSummaryVotesModel.getGameSummaryVoteScore(10)
    expect(voteScore).toBe(1)
  })

  it('should update an existing vote for the same session', async () => {
    const agent = request.agent(app)

    await agent.post('/games/11/summary-vote').send({ vote_type: 'up' }).expect(200)

    const response = await agent
      .post('/games/11/summary-vote')
      .send({ vote_type: 'down' })
      .expect('Content-Type', /json/)
      .expect(200)

    expect(response.body).toEqual({
      message: "Vote 'down' recorded for game ID 11",
    })

    const voteScore = await gameSummaryVotesModel.getGameSummaryVoteScore(11)
    expect(voteScore).toBe(-1)
  })

  it('should issue decku.sid cookie and reuse the same session id across requests', async () => {
    const voteSpy = vi.spyOn(gameSummaryVotesModel, 'voteGamePerformanceSummary')
    const agent = request.agent(app)

    const firstResponse = await agent
      .post('/games/13/summary-vote')
      .send({ vote_type: 'up' })
      .expect(200)

    await agent.post('/games/13/summary-vote').send({ vote_type: 'down' }).expect(200)

    expect(firstResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('decku.sid=')])
    )
    expect(voteSpy).toHaveBeenCalledTimes(2)
    expect(voteSpy.mock.calls[0]?.[1]).toBe(voteSpy.mock.calls[1]?.[1])
  })

  it('should return 400 for invalid vote type', async () => {
    const response = await request(app)
      .post('/games/12/summary-vote')
      .send({ vote_type: 'sideways' })
      .expect('Content-Type', /json/)
      .expect(400)

    expect(response.body.error).toBe('Invalid request body')
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'vote_type',
        }),
      ])
    )
  })

  it('should return 400 when vote type is missing', async () => {
    const response = await request(app)
      .post('/games/12/summary-vote')
      .send({})
      .expect('Content-Type', /json/)
      .expect(400)

    expect(response.body.error).toBe('Invalid request body')
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'vote_type',
        }),
      ])
    )
  })

  it('should return 400 for invalid game ID format', async () => {
    const response = await request(app)
      .post('/games/abc/summary-vote')
      .send({ vote_type: 'up' })
      .expect('Content-Type', /json/)
      .expect(400)

    expect(response.body.error).toBe('Invalid request parameters')
  })

  it('should return 500 when vote persistence fails', async () => {
    const mockError = new Error('Vote persistence failed')
    vi.spyOn(gameSummaryVotesModel, 'voteGamePerformanceSummary').mockRejectedValueOnce(mockError)

    const response = await request(app)
      .post('/games/12/summary-vote')
      .send({ vote_type: 'up' })
      .expect('Content-Type', /json/)
      .expect(500)

    expect(response.body).toEqual({
      error: 'Internal server error',
    })
  })
})
