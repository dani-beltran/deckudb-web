import { defineEventHandler } from 'h3'
import z from 'zod'
import { apiHandler, parseParams, requireJobApiKey } from '../../utils/api'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    requireJobApiKey(event)
    const { job_id } = await parseParams(
      event.context.params,
      z.object({ job_id: z.uuid({ version: 'v4' }) })
    )
    const { repositories } = event.context
    await repositories.jobs.deleteJob(job_id)
  })
)
