import type { Request, Response } from 'express'
import { NotFoundError } from '../../errors/NotFoundError'
import { createController } from '../../lib/controller-factory'
import type { PaginatedResult } from '../../lib/pagination'
import type { Sort } from '../../types/db.types'
import type { AppDependencies } from '../../types/dependencies'
import type { Job } from './jobs.model'
import type { GetJobParams, JobsQuery, QueueJobBody } from './jobs.router'

export const createJobsControllers = ({ repositories }: AppDependencies) => {
  /**
   * Controller to queue a new job.
   * The controller is composed using the createController helper to handle errors and responses consistently.
   */
  const queueJobRequestHandler = async (
    req: Request<unknown, unknown, QueueJobBody>,
    res: Response
  ): Promise<Job> => {
    const { game_id, job_type } = req.body
    const steamApp = await repositories.steamCache.getGameDetails(game_id).catch(() => {
      throw new NotFoundError('Game not found on Steam')
    })

    const gameName = steamApp?.name || 'Unknown Game'
    const job = await repositories.jobs.queueJob({
      game_id,
      job_type,
      game_name: gameName,
    })
    res.status(201)
    return job
  }

  /**
   * Controller to get jobs with optional filters, sorting, and pagination.
   * The controller is composed using the createController helper to handle errors and responses consistently.
   */
  const getJobsRequestHandler = async (
    req: Request,
    _res: Response
  ): Promise<PaginatedResult<Job>> => {
    const { status, job_type, game_id, page, page_size, sort_by, sort_order } =
      req.query as unknown as JobsQuery
    const filters = {
      status,
      job_type,
      game_id,
    }
    const sort: Sort<Job> = { [sort_by]: sort_order === 'asc' ? 1 : -1 }

    const result = await repositories.jobs.getJobs(filters, sort, {
      page,
      page_size: page_size,
    })
    return result
  }

  /**
   * Controller to delete a job by ID.
   * The controller is composed using the createController helper to handle errors and responses consistently.
   */
  const deleteJobRequestHandler = async (req: Request, _res: Response): Promise<void> => {
    const { job_id } = req.params as GetJobParams
    await repositories.jobs.deleteJob(job_id)
    return
  }

  return {
    queueJobCtrl: createController(queueJobRequestHandler),
    getJobsCtrl: createController(getJobsRequestHandler),
    deleteJobCtrl: createController(deleteJobRequestHandler),
  }
}
