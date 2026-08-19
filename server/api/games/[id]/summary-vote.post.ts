import { defineEventHandler } from 'h3'
import z from 'zod'
import { VOTE_TYPE } from '../../../models/game-summary-votes.schema'
import { gameIdSchema } from '../../../models/games.schema'
import { apiHandler, getSessionId, parseBody, parseParams } from '../../../utils/api'

const summaryVoteBodySchema = z.object({ vote_type: z.enum(VOTE_TYPE) })

export type SummaryVoteRequest = z.infer<typeof summaryVoteBodySchema>
export type SummaryVoteResponse = { message: string }

export default defineEventHandler((event) =>
  apiHandler<SummaryVoteResponse>(event, async () => {
    const { id } = await parseParams(event.context.params, z.object({ id: gameIdSchema }))
    const { vote_type } = await parseBody(event, summaryVoteBodySchema)
    const { repositories } = event.context
    await repositories.gameSummaryVotes.voteGameSummary(id, getSessionId(event), vote_type)
    return { message: `Vote '${vote_type}' recorded for game ID ${id}` }
  })
)
