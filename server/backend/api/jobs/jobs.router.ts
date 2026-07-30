import { Router } from 'express'
import z from 'zod'
import { paginationSchema } from '../../lib/pagination'
import { requireApiKey } from '../../middleware/api-key'
import { validateBody, validateParams, validateQuery } from '../../middleware/validation'
import type { AppDependencies } from '../../types/dependencies'
import { gameIdSchema } from '../games/games.schema'
import { createJobsControllers } from './jobs.ctrl'
import { JOB_STATUS, JOB_TYPE } from './jobs.model'

const jobsQuerySchema = paginationSchema.extend({
  // Filters
  status: z.enum(JOB_STATUS).optional(),
  job_type: z.enum(JOB_TYPE).optional(),
  game_id: gameIdSchema.optional(),
  // Sorting
  sort_by: z.enum(['created_at']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

const queueJobBodySchema = z.object({
  game_id: gameIdSchema,
  job_type: z.enum(JOB_TYPE),
})

const getJobParamsSchema = z.object({
  job_id: z.uuid({ version: 'v4' }),
})

export type QueueJobBody = z.infer<typeof queueJobBodySchema>
export type GetJobParams = z.infer<typeof getJobParamsSchema>
export type JobsQuery = z.infer<typeof jobsQuerySchema>

export const createJobsRouter = (dependencies: AppDependencies) => {
  const router = Router()
  const { deleteJobCtrl, getJobsCtrl, queueJobCtrl } = createJobsControllers(dependencies)

  router.get('/jobs', requireApiKey, validateQuery(jobsQuerySchema), getJobsCtrl)

  router.post('/jobs/queue', requireApiKey, validateBody(queueJobBodySchema), queueJobCtrl)

  router.delete('/jobs/:job_id', requireApiKey, validateParams(getJobParamsSchema), deleteJobCtrl)

  return router
}
