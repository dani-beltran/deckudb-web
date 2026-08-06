import { defineEventHandler } from 'h3'
import z from 'zod'
import { VOTE_TYPE } from '../../../models/game-summary-votes.schema'
import { gameIdSchema } from '../../../models/games.schema'
import { apiHandler, getSessionId, parseBody, parseParams } from '../../../utils/api'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    const { id } = await parseParams(event.context.params, z.object({ id: gameIdSchema }))
    const { vote_type } = await parseBody(event, z.object({ vote_type: z.enum(VOTE_TYPE) }))
    const { repositories } = event.context
    await repositories.gameSummaryVotes.voteGameSummary(
      id,
      getSessionId(event),
      vote_type
    )
    return { message: `Vote '${vote_type}' recorded for game ID ${id}` }
  })
)
