import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { VOTE_TYPE } from '../../models/game-summary-votes.schema'
import { STEAMDECK_RATING } from '../../models/games.schema'
import { JOB_TYPE } from '../../models/jobs.model'
import { cacheSteamApp, mountNuxtTestApp, type NuxtTestApp, unmountNuxtTestApp } from './test-app'
import { flushDB } from './test-db'

let testApp: NuxtTestApp

describe('Nuxt games API', () => {
  beforeAll(async () => {
    testApp = await mountNuxtTestApp()
  })

  afterEach(async () => {
    await flushDB(testApp.db)
  })

  afterAll(async () => {
    await unmountNuxtTestApp(testApp)
  })

  it('returns a saved game and its reports', async () => {
    const now = new Date()
    await testApp.db.collection('games').insertOne({
      game_id: 1,
      game_performance_summary: 'Runs smoothly on Steam Deck',
      steamdeck_rating: STEAMDECK_RATING.GOLD,
      created_at: now,
      updated_at: now,
    })
    await testApp.db.collection('game-reports').insertOne({
      game_id: 1,
      title: 'Solid performance',
      source: 'protondb',
      url: 'https://example.com/report',
      reporter: { username: 'deck-user' },
      posted_at: now,
      created_at: now,
      updated_at: now,
    })
    await cacheSteamApp(testApp.db, 1, { steam_appid: 1, name: 'Deck game', type: 'game' })

    const response = await request(testApp.app).get('/api/games/1').expect(200)

    expect(response.body).toMatchObject({
      status: 'ready',
      game: {
        game_id: 1,
        game_performance_summary: 'Runs smoothly on Steam Deck',
        steamdeck_rating: STEAMDECK_RATING.GOLD,
        steam_app: { name: 'Deck game' },
      },
    })
    expect(response.body.game.reports).toEqual([
      expect.objectContaining({ game_id: 1, title: 'Solid performance' }),
    ])
  })

  it('queues a full scrape when a cached Steam game has not been processed', async () => {
    await cacheSteamApp(testApp.db, 99, { steam_appid: 99, name: 'New game', type: 'game' })

    const response = await request(testApp.app).get('/api/games/99').expect(200)

    expect(response.body).toMatchObject({
      status: 'queued',
      game: { game_id: 99, steam_app: { name: 'New game' }, reports: [] },
    })
    expect(await testApp.db.collection('jobs').findOne({ game_id: 99 })).toMatchObject({
      game_name: 'New game',
      job_type: JOB_TYPE.FULL,
      status: 'queued',
    })
  })

  it('rejects an invalid game id', async () => {
    const response = await request(testApp.app).get('/api/games/not-a-number').expect(400)

    expect(response.body.data.error).toBe('Invalid request parameters')
  })

  it('records one session vote and updates it when the visitor votes again', async () => {
    const client = request.agent(testApp.app)

    await client.post('/api/games/7/summary-vote').send({ vote_type: VOTE_TYPE.UP }).expect(200)
    await client.post('/api/games/7/summary-vote').send({ vote_type: VOTE_TYPE.DOWN }).expect(200)

    const votes = await testApp.db.collection('game-summary-votes').find({ game_id: 7 }).toArray()
    expect(votes).toHaveLength(1)
    expect(votes[0]).toMatchObject({ game_id: 7, vote_type: VOTE_TYPE.DOWN })
  })

  it('validates the vote payload', async () => {
    const response = await request(testApp.app)
      .post('/api/games/7/summary-vote')
      .send({ vote_type: 'maybe' })
      .expect(400)

    expect(response.body.data.error).toBe('Invalid request body')
  })
})
