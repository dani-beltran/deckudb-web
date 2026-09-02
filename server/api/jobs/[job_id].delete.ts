import { defineEventHandler } from 'h3'
import z from 'zod'
import { AUDIT_ACTION_TYPE, AUDIT_TARGET_RESOURCE } from '../../models/audit-logs.schema'
import { apiHandler, parseParams, requireAdmin } from '../../utils/api'
import { withAuditLog } from '../../utils/audit-log'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    requireAdmin(event)
    return withAuditLog(
      event,
      {
        action_type: AUDIT_ACTION_TYPE.JOB_DELETE,
        target_resource: AUDIT_TARGET_RESOURCE.JOB,
      },
      async (audit) => {
        const requestedJobId = event.context.params?.job_id
        if (typeof requestedJobId === 'string') {
          const normalizedJobId = requestedJobId.trim()
          if (normalizedJobId && normalizedJobId.length <= 255) audit.target_id = normalizedJobId
        }

        const { job_id } = await parseParams(
          event.context.params,
          z.object({ job_id: z.uuid({ version: 'v4' }) })
        )
        audit.target_id = job_id

        const { repositories } = event.context
        const job = await repositories.jobs.getJobById(job_id).catch(() => null)
        if (job) {
          audit.context = {
            game_id: job.game_id,
            game_name: job.game_name,
            job_type: job.job_type,
          }
        }
        
        await repositories.jobs.deleteJob(job_id)
      }
    )
  })
)
