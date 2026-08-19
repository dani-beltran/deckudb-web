import { defineEventHandler, setResponseStatus } from 'h3'
import z from 'zod'
import { gameIdSchema } from '../../models/games.schema'
import { JOB_TYPE, type Job } from '../../models/jobs.schema'
import { apiHandler, parseBody, requireAdmin } from '../../utils/api'
import { NotFoundError } from '../../utils/errors/NotFoundError'

const queueJobBodySchema = z.object({ game_id: gameIdSchema, job_type: z.enum(JOB_TYPE) })

export type QueueJobRequest = z.infer<typeof queueJobBodySchema>
export type QueueJobResponse = Job

export default defineEventHandler((event) =>
  apiHandler<QueueJobResponse>(event, async () => {
    requireAdmin(event)

    const { game_id, job_type } = await parseBody(event, queueJobBodySchema)
    const { repositories } = event.context
    const steamApp = await repositories.steamCache.getGameDetails(game_id).catch(() => {
      throw new NotFoundError('Game not found on Steam')
    })

    setResponseStatus(event, 201)
    return repositories.jobs.queueJob({
      game_id,
      job_type,
      game_name: steamApp?.name || 'Unknown Game',
    })
  })
)
