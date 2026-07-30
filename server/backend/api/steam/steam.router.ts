import { Router } from 'express'
import z from 'zod'
import { paginationSchema } from '../../lib/pagination.js'
import { validateParams, validateQuery } from '../../middleware/validation.js'
import type { AppDependencies } from '../../types/dependencies'
import { gameIdSchema } from '../games/games.schema'
import { createSteamControllers } from './steam.ctrl'

const gameIdsQuerySchema = z.object({
  ids: z
    .string()
    .min(1, 'At least one game ID is required')
    .transform((val, ctx) => {
      const parts = val.split(',')
      const result: number[] = []
      for (const part of parts) {
        const parsed = gameIdSchema.safeParse(part)
        if (!parsed.success) {
          ctx?.addIssue(parsed.error.issues[0]?.message ?? 'Invalid game ID')
          return z.NEVER
        }
        result.push(parsed.data)
      }
      return result
    }),
})

const steamSearchTermSchema = z.object({
  term: z.string().min(1, 'Search term is required'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
})

const gameIdParamSchema = z.object({
  id: gameIdSchema,
})

export type SteamSearchQuery = z.infer<typeof steamSearchTermSchema>
export type SteamGameIdParam = z.infer<typeof gameIdParamSchema>
export type SteamGameIdsQuery = z.infer<typeof gameIdsQuerySchema>

export const createSteamRouter = (dependencies: AppDependencies) => {
  const router = Router()
  const {
    getManySteamGamesDetailsCtrl,
    getMostPlayedSteamDeckGamesCtrl,
    getSteamGameDetailsCtrl,
    searchSteamGamesCtrl,
  } = createSteamControllers(dependencies)

  router.get('/steam/games/batch', validateQuery(gameIdsQuerySchema), getManySteamGamesDetailsCtrl)

  router.get('/steam/games', validateQuery(steamSearchTermSchema), searchSteamGamesCtrl)

  router.get('/steam/games/:id', validateParams(gameIdParamSchema), getSteamGameDetailsCtrl)

  router.get(
    '/steam/most-played-steam-deck-games',
    validateQuery(paginationSchema),
    getMostPlayedSteamDeckGamesCtrl
  )

  return router
}
