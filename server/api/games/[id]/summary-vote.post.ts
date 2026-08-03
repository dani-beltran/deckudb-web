import { defineEventHandler } from 'h3'
import z from 'zod'
import { VOTE_TYPE } from '../../../backend/api/games/game-summary-votes.schema'
import { gameIdSchema } from '../../../backend/api/games/games.schema'
import {
  apiHandler,
  getSessionId,
  parseBody,
  parseParams,
  useApiDependencies,
} from '../../../utils/api'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    const { id } = await parseParams(event.context.params, z.object({ id: gameIdSchema }))
    const { vote_type } = await parseBody(event, z.object({ vote_type: z.enum(VOTE_TYPE) }))
    const { repositories } = await useApiDependencies()
    await repositories.gameSummaryVotes.voteGamePerformanceSummary(
      id,
      getSessionId(event),
      vote_type
    )
    return { message: `Vote '${vote_type}' recorded for game ID ${id}` }
  })
)
