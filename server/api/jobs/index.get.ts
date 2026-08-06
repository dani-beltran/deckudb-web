import { defineEventHandler } from 'h3'
import z from 'zod'
import { JOB_STATUS, JOB_TYPE } from '../../models/jobs.model'
import { apiHandler, parseQuery, requireJobApiKey } from '../../utils/api'
import { paginationSchema } from '../../utils/pagination'

const jobsQuerySchema = paginationSchema.extend({
  status: z.enum(JOB_STATUS).optional(),
  job_type: z.enum(JOB_TYPE).optional(),
  game_id: z.coerce.number().int().positive().optional(),
  sort_by: z.enum(['created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    requireJobApiKey(event)
    const { status, job_type, game_id, page, page_size, sort_by, sort_order } = await parseQuery(
      event,
      jobsQuerySchema
    )
    const { repositories } = event.context
    return repositories.jobs.getJobs(
      { status, job_type, game_id },
      { [sort_by]: sort_order === 'asc' ? 1 : -1 },
      { page, page_size }
    )
  })
)
