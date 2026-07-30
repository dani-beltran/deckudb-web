import { Router } from 'express'
import z from 'zod'
import { validateBody, validateParams } from '../../middleware/validation'
import type { AppDependencies } from '../../types/dependencies'
import { VOTE_TYPE } from './game-summary-votes.schema'
import { createGamesControllers } from './games.ctrl'
import { gameIdSchema } from './games.schema'

const getGameByIdParamsSchema = z.object({
  id: gameIdSchema,
})

const voteGameSummaryBodySchema = z.object({
  vote_type: z.enum(VOTE_TYPE),
})

export type GetGameByIdParams = z.infer<typeof getGameByIdParamsSchema>
export type VoteGameSummaryBody = z.infer<typeof voteGameSummaryBodySchema>

export const createGamesRouter = (dependencies: AppDependencies) => {
  const router = Router()
  const { getGameByIdCtrl, voteGameSummaryCtrl } = createGamesControllers(dependencies)

  router.get('/games/:id', validateParams(getGameByIdParamsSchema), getGameByIdCtrl)

  router.post(
    '/games/:id/summary-vote',
    validateParams(getGameByIdParamsSchema),
    validateBody(voteGameSummaryBodySchema),
    voteGameSummaryCtrl
  )

  return router
}
