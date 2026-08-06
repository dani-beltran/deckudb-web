import type { GameReport } from '@server/models/game-reports.schema'
import { SCRAPE_SOURCES } from '@server/models/game-sources.schema'
import { VOTE_TYPE } from '@server/models/game-summary-votes.schema'
import { type Game, STEAMDECK_HARDWARE, STEAMDECK_RATING } from '@server/models/games.schema'
import { JOB_STATUS, JOB_TYPE, type Job } from '@server/models/jobs.schema'
import * as steamService from '@server/services/steam/steam'
import { STEAMDECK_VERIFICATION_STATUS, type SteamApp } from '@server/services/steam/steam.types'
import { bootstrapDependencies, type ServerDependencies } from '@server/utils/bootstrap'
import type { NodeListener } from 'h3'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNuxtTestServer } from '../test-server'

const makeComplexReport = (): GameReport => {
  const now = new Date()
  return {
    game_id: 3,
    title: 'Excellent on OLED',
    game_settings: { quality: 'Ultra', antiAliasing: 'TAA', vsync: 'yes' },
    steamdeck_settings: {
      frame_rate_cap: 60,
      screen_refresh_rate: 90,
      proton_version: '8.0',
    },
    steamdeck_hardware: STEAMDECK_HARDWARE.OLED,
    battery_performance: { consumption: '20W', temps: '65C', life_span: '2.5 hours' },
    steamdeck_experience: { average_frame_rate: 55 },
    source: SCRAPE_SOURCES.OTHER,
    url: 'https://example.com/report/3',
    reporter: { username: 'poweruser', user_profile_url: 'https://example.com/poweruser' },
    notes: 'Amazing performance with ultra settings on OLED',
    posted_at: now,
    created_at: now,
    updated_at: now,
  }
}

describe('games API', () => {
  let testServer: NodeListener
  let dependencies: ServerDependencies

  beforeAll(async () => {
    dependencies = await bootstrapDependencies({ dbConnectionName: 'test-games-api' })
    testServer = createNuxtTestServer(dependencies)
  })

  beforeEach(() => {
    vi.mocked(steamService.getSteamGameDetails).mockImplementation(
      async (gameId) =>
        ({
          steam_appid: gameId,
          name: `Mocked Steam Game ${gameId}`,
          type: 'game',
        }) as SteamApp
    )
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await dependencies.databaseClient.flushDB()
  })

  afterAll(async () => {
    await dependencies.databaseClient.disconnect()
  })

  describe('GET /api/games/:id', () => {
    it('returns a game and its reports for a valid ID', async () => {
      const now = new Date()
      const game: Game = {
        game_id: 1,
        game_performance_summary: 'Runs smoothly on Steam Deck',
        steamdeck_rating: STEAMDECK_RATING.GOLD,
        steamdeck_verified: true,
        steamdeck_verification_status: STEAMDECK_VERIFICATION_STATUS.VERIFIED,
        generated_at: now,
        created_at: now,
        updated_at: now,
      }
      const report: GameReport = {
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
        },
        notes: 'Works great with these settings',
        posted_at: now,
        created_at: now,
        updated_at: now,
      }
      await dependencies.repositories.games.insertTestGames([game])
      await dependencies.repositories.gameReports.insertTestGameReports([report])

      const response = await request(testServer).get('/api/games/1').expect(200)

      expect(response.body).toMatchObject({
        status: 'ready',
        game: {
          game_id: 1,
          game_performance_summary: 'Runs smoothly on Steam Deck',
          steamdeck_rating: STEAMDECK_RATING.GOLD,
          steamdeck_verified: true,
          steamdeck_verification_status: STEAMDECK_VERIFICATION_STATUS.VERIFIED,
          steam_app: { steam_appid: 1, name: 'Mocked Steam Game 1' },
        },
      })
      expect(response.body.game.reports).toEqual([
        expect.objectContaining({ game_id: 1, title: 'Great performance on LCD' }),
      ])
    })

    it('returns a game with minimal data and no reports', async () => {
      const now = new Date()
      await dependencies.repositories.games.insertTestGames([
        { game_id: 2, created_at: now, updated_at: now },
      ])

      const response = await request(testServer).get('/api/games/2').expect(200)

      expect(response.body.status).toBe('ready')
      expect(response.body.game).toMatchObject({ game_id: 2, reports: [] })
    })

    it('returns complex report fields unchanged', async () => {
      const now = new Date()
      const report = makeComplexReport()
      await dependencies.repositories.games.insertTestGames([
        { game_id: 3, created_at: now, updated_at: now },
      ])
      await dependencies.repositories.gameReports.insertTestGameReports([report])

      const response = await request(testServer).get('/api/games/3').expect(200)

      expect(response.body.game.reports).toHaveLength(1)
      expect(response.body.game.reports[0]).toMatchObject({
        game_settings: report.game_settings,
        steamdeck_settings: report.steamdeck_settings,
        steamdeck_hardware: report.steamdeck_hardware,
        battery_performance: report.battery_performance,
        steamdeck_experience: report.steamdeck_experience,
      })
    })

    it('returns the requested game when several games exist', async () => {
      const now = new Date()
      await dependencies.repositories.games.insertTestGames(
        [1, 2, 3].map((game_id) => ({ game_id, created_at: now, updated_at: now }))
      )

      const response = await request(testServer).get('/api/games/2').expect(200)

      expect(response.body.game.game_id).toBe(2)
    })

    it('queues a full scrape for an unprocessed Steam game', async () => {
      const response = await request(testServer).get('/api/games/999').expect(200)

      expect(response.body).toMatchObject({
        status: 'queued',
        game: { game_id: 999, reports: [], steam_app: { type: 'game' } },
      })
      expect(
        await dependencies.repositories.jobs.getLastNotFailedJob(999, JOB_TYPE.FULL)
      ).toMatchObject({
        game_id: 999,
        job_type: JOB_TYPE.FULL,
        status: JOB_STATUS.QUEUED,
      })
    })

    it.each(['abc', '-1', '0', '1.5'])('returns 400 for invalid ID %s', async (id) => {
      const response = await request(testServer).get(`/api/games/${id}`).expect(400)

      expect(response.body.data.error).toBe('Invalid request parameters')
    })

    it('returns 500 when the game query fails', async () => {
      vi.spyOn(dependencies.repositories.games, 'fetchGameById').mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const response = await request(testServer).get('/api/games/1').expect(500)

      expect(response.body.data.error).toBe('Internal server error')
    })

    it.each([JOB_STATUS.QUEUED, JOB_STATUS.IN_PROGRESS])(
      'does not duplicate a recent %s full job',
      async (status) => {
        const now = new Date()
        const existingJob: Job = {
          job_id: `existing-${status}`,
          job_type: JOB_TYPE.FULL,
          game_id: 999,
          status,
          started_at: status === JOB_STATUS.IN_PROGRESS ? now : null,
          completed_at: null,
          created_at: now,
          updated_at: now,
        }
        await dependencies.repositories.jobs.insertTestJobs([existingJob])

        const queueJob = vi.spyOn(dependencies.repositories.jobs, 'queueJob')

        const response = await request(testServer).get('/api/games/999').expect(200)

        expect(response.body.status).toBe('queued')
        expect(queueJob).not.toHaveBeenCalled()
      }
    )

    it('does not queue a scrape for a non-game Steam app', async () => {
      vi.mocked(steamService.getSteamGameDetails).mockResolvedValueOnce({
        steam_appid: 999,
        name: 'Steam tool',
        type: 'application',
      } as SteamApp)
      const queueJob = vi.spyOn(dependencies.repositories.jobs, 'queueJob')

      const response = await request(testServer).get('/api/games/999').expect(200)

      expect(response.body.status).toBe('invalid')
      expect(queueJob).not.toHaveBeenCalled()
    })

    it('handles a maximum signed 32-bit game ID', async () => {
      const gameId = 2_147_483_647
      const now = new Date()
      await dependencies.repositories.games.insertTestGames([
        { game_id: gameId, created_at: now, updated_at: now },
      ])

      const response = await request(testServer).get(`/api/games/${gameId}`).expect(200)

      expect(response.body).toMatchObject({ status: 'ready', game: { game_id: gameId } })
    })
  })

  describe('POST /api/games/:id/summary-vote', () => {
    it('records an up vote', async () => {
      const response = await request(testServer)
        .post('/api/games/10/summary-vote')
        .send({ vote_type: VOTE_TYPE.UP })
        .expect(200)

      expect(response.body).toEqual({ message: "Vote 'up' recorded for game ID 10" })
      expect(await dependencies.repositories.gameSummaryVotes.getGameSummaryVoteScore(10)).toBe(1)
    })

    it('updates an existing vote for the same session', async () => {
      const client = request.agent(testServer)
      await client.post('/api/games/11/summary-vote').send({ vote_type: VOTE_TYPE.UP }).expect(200)
      await client
        .post('/api/games/11/summary-vote')
        .send({ vote_type: VOTE_TYPE.DOWN })
        .expect(200)

      expect(await dependencies.repositories.gameSummaryVotes.getGameSummaryVoteScore(11)).toBe(-1)
    })

    it('issues a session cookie and reuses its session ID', async () => {
      const vote = vi.spyOn(dependencies.repositories.gameSummaryVotes, 'voteGameSummary')
      const client = request.agent(testServer)

      const first = await client
        .post('/api/games/13/summary-vote')
        .send({ vote_type: VOTE_TYPE.UP })
        .expect(200)
      await client
        .post('/api/games/13/summary-vote')
        .send({ vote_type: VOTE_TYPE.DOWN })
        .expect(200)

      expect(first.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringContaining('decku.sid=')])
      )
      expect(vote.mock.calls[0]?.[1]).toBe(vote.mock.calls[1]?.[1])
    })

    it.each([
      [{ vote_type: 'sideways' }, 'vote_type'],
      [{}, 'vote_type'],
    ])('validates vote payload %j', async (body, field) => {
      const response = await request(testServer)
        .post('/api/games/12/summary-vote')
        .send(body)
        .expect(400)

      expect(response.body.data.error).toBe('Invalid request body')
      expect(response.body.data.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field })])
      )
    })

    it('validates the game ID', async () => {
      const response = await request(testServer)
        .post('/api/games/abc/summary-vote')
        .send({ vote_type: VOTE_TYPE.UP })
        .expect(400)

      expect(response.body.data.error).toBe('Invalid request parameters')
    })

    it('returns 500 when vote persistence fails', async () => {
      vi.spyOn(dependencies.repositories.gameSummaryVotes, 'voteGameSummary').mockRejectedValueOnce(
        new Error('Vote persistence failed')
      )

      const response = await request(testServer)
        .post('/api/games/12/summary-vote')
        .send({ vote_type: VOTE_TYPE.UP })
        .expect(500)

      expect(response.body.data.error).toBe('Internal server error')
    })
  })
})
