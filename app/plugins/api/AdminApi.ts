import type { $Fetch, NitroFetchOptions } from 'nitropack/types'
import { ApiError } from './ApiError'
import { throwApiError } from './errorHelpers'
import type {
  AdminSession,
  GameSearchResult,
  Job,
  JobType,
  PaginatedResult,
  SearchResult,
} from './types'

/**
 * AdminApi is a client for interacting with the admin API endpoints.
 */
export class AdminApi {
  constructor(private readonly api: $Fetch) {}

  async getAdminSession(): Promise<AdminSession> {
    try {
      return await this.requestJson<AdminSession>('/admin/auth/session')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return { authenticated: false }
      }
      throw error
    }
  }

  async loginAdmin(username: string, password: string): Promise<AdminSession> {
    const response = await this.requestJson<AdminSession | undefined>('/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username, password },
    })

    return response ?? { authenticated: true }
  }

  async logoutAdmin(): Promise<void> {
    await this.requestJson<void>('/admin/auth/logout', { method: 'POST' })
  }

  async fetchAllJobs(signal?: AbortSignal): Promise<Job[]> {
    const pageSize = 100
    const jobsById = new Map<string, Job>()
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const response = await this.fetchJobsPage(page, pageSize, signal)
      for (const job of response.items) jobsById.set(job.job_id, job)

      totalPages = Math.max(totalPages, response.total_pages)
      page += 1
    }

    return [...jobsById.values()]
  }

  searchGames(term: string, signal?: AbortSignal): Promise<SearchResult<GameSearchResult>> {
    return this.requestJson<SearchResult<GameSearchResult>>('/steam/games', {
      query: { term, limit: 20 },
      signal,
    })
  }

  queueJob(gameId: number, jobType: JobType): Promise<Job> {
    return this.requestJson<Job>('/jobs/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { game_id: gameId, job_type: jobType },
    })
  }

  deleteJob(jobId: string): Promise<void> {
    return this.requestJson<void>(`/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' })
  }

  private fetchJobsPage(
    page: number,
    pageSize: number,
    signal?: AbortSignal
  ): Promise<PaginatedResult<Job>> {
    return this.requestJson<PaginatedResult<Job>>('/jobs', {
      query: { page, page_size: pageSize, sort_by: 'created_at', sort_order: 'desc' },
      signal,
    })
  }

  private async requestJson<T>(url: string, init: NitroFetchOptions<string> = {}): Promise<T> {
    try {
      return (await this.api<T, string>(url, { cache: 'no-store', ...init })) as T
    } catch (error) {
      throwApiError(error)
    }
  }
}
