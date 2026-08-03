import { defineEventHandler, setResponseStatus } from 'h3'
import z from 'zod'
import { gameIdSchema } from '../../backend/api/games/games.schema'
import { JOB_TYPE } from '../../backend/api/jobs/jobs.model'
import { NotFoundError } from '../../backend/errors/NotFoundError'
import { apiHandler, parseBody, requireJobApiKey, useApiDependencies } from '../../utils/api'

const queueJobBodySchema = z.object({ game_id: gameIdSchema, job_type: z.enum(JOB_TYPE) })

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    // Only allow requests with a valid API key to queue jobs
    requireJobApiKey(event)

    const { game_id, job_type } = await parseBody(event, queueJobBodySchema)
    const { repositories } = await useApiDependencies()
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
