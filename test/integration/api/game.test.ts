import type { NodeListener } from 'h3'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createNuxtTestServer } from './test-server';
import request from 'supertest'
import type { ApiDependencies } from '@server/utils/bootstrap';
import { bootstrapDependencies } from '@server/utils/bootstrap';
import type { Game } from '@server/models/games.schema';
import type { SteamApp } from '@server/services/steam/steam.types';
import * as steamService from '@server/services/steam/steam';

describe('GET /api/games/:id', async () => {
    let testServer: NodeListener;
    let dependencies: ApiDependencies;

    beforeAll(async () => {
        dependencies = await bootstrapDependencies({ dbConnectionName: 'test' })
        testServer = createNuxtTestServer(dependencies)

        const { repositories } = dependencies
        const testGames: Game[] = [
            {
                game_id: 1,
                generated_at: new Date(),
                updated_at: new Date(),
                created_at: new Date(),
            },
            {
                game_id: 2,
                generated_at: new Date(),
                updated_at: new Date(),
                created_at: new Date(),
            },
        ]
        await repositories.games.insertTestGames(testGames)

        vi.mocked(steamService.getSteamGameDetails).mockImplementation(async (gameId) => {
            const steamApps: Partial<SteamApp>[] = [
                {
                    type: "game",
                    name: "Test Game 1",
                },
                {
                    type: "game",
                    name: "Test Game 2",
                },
            ]
            const gameDetails = steamApps[gameId - 1]
            if (!gameDetails) {
                throw new Error(`Game with ID ${gameId} not found in Steam`)
            }
            return gameDetails as SteamApp
        });
    })

    afterAll(async () => {
        const { databaseClient } = dependencies
        await databaseClient.flushDB()
        await databaseClient.disconnect()
        vi.resetAllMocks()
    })

    it("should return 200 and game data for valid ID", async () => {
        const res = await request(testServer).get('/api/games/1')
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('status', 'ready')
        expect(res.body.game).toHaveProperty('game_id', 1)
        expect(res.body.game).toHaveProperty('generated_at')
        expect(res.body.game).toHaveProperty('updated_at')
        expect(res.body.game).toHaveProperty('created_at')
    })

    
    it("should return 400 for invalid ID format (non-numeric)", async () => {
        const res = await request(testServer).get('/api/games/abc')
        expect(res.status).toBe(400)
    })

    it("should return 404 for non-existent game ID", async () => {
        const res = await request(testServer).get('/api/games/999999999')
        expect(res.status).toBe(404)
    })
})
