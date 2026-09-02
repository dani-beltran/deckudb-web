import { defineEventHandler, setResponseStatus } from 'h3'
import z from 'zod'
import { AUDIT_ACTION_TYPE, AUDIT_TARGET_RESOURCE } from '../../models/audit-logs.schema'
import { gameIdSchema } from '../../models/games.schema'
import { JOB_TYPE, type Job } from '../../models/jobs.schema'
import { apiHandler, parseBody, requireAdmin } from '../../utils/api'
import { withAuditLog } from '../../utils/audit-log'
import { NotFoundError } from '../../utils/errors/NotFoundError'

const queueJobBodySchema = z.object({ game_id: gameIdSchema, job_type: z.enum(JOB_TYPE) })

export type QueueJobRequest = z.infer<typeof queueJobBodySchema>
export type QueueJobResponse = Job

export default defineEventHandler((event) =>
  apiHandler<QueueJobResponse>(event, async () => {
    requireAdmin(event)
    return withAuditLog(
      event,
      {
        action_type: AUDIT_ACTION_TYPE.JOB_RUN,
        target_resource: AUDIT_TARGET_RESOURCE.JOB,
        resolveSuccess: (job: Job) => ({ target_id: job.job_id }),
      },
      async (audit) => {
        const { game_id, job_type } = await parseBody(event, queueJobBodySchema)
        audit.context = { game_id, job_type }
        const { repositories } = event.context
        const steamApp = await repositories.steamCache.getGameDetails(game_id).catch(() => {
          throw new NotFoundError('Game not found on Steam')
        })
        const gameName = steamApp?.name || 'Unknown Game'
        audit.context = { ...audit.context, game_name: gameName }

        setResponseStatus(event, 201)
        return repositories.jobs.queueJob({ game_id, job_type, game_name: gameName })
      }
    )
  })
)
