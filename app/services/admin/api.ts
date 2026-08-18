import type {
  AdminSession,
  GameSearchResult,
  Job,
  JobType,
  PaginatedResult,
  SearchResult,
} from './types'

type ApiErrorBody = {
  error?: unknown
  message?: unknown
  statusMessage?: unknown
  data?: { error?: unknown; message?: unknown }
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

async function parseResponseError(response: Response) {
  let payload: ApiErrorBody | undefined

  try {
    payload = (await response.json()) as ApiErrorBody
  } catch {
    // Non-JSON errors fall back to the HTTP status below.
  }

  const detail =
    payload?.data?.error ?? payload?.error ?? payload?.statusMessage ?? payload?.message
  const message =
    typeof detail === 'string' && detail.trim()
      ? detail
      : `Request failed (${response.status} ${response.statusText})`

  return new AdminApiError(message, response.status)
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: {
      Accept: 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) throw await parseResponseError(response)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function getAdminSession(): Promise<AdminSession> {
  try {
    return await requestJson<AdminSession>('/api/admin/auth/session')
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 401) {
      return { authenticated: false }
    }
    throw error
  }
}

export async function loginAdmin(username: string, password: string): Promise<AdminSession> {
  const response = await requestJson<AdminSession | undefined>('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  return response ?? { authenticated: true }
}

export async function logoutAdmin(): Promise<void> {
  await requestJson<void>('/api/admin/auth/logout', { method: 'POST' })
}

async function fetchJobsPage(
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<PaginatedResult<Job>> {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: 'created_at',
    sort_order: 'desc',
  })
  return requestJson<PaginatedResult<Job>>(`/api/jobs?${query}`, { signal })
}

export async function fetchAllJobs(signal?: AbortSignal): Promise<Job[]> {
  const pageSize = 100
  const jobsById = new Map<string, Job>()
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const response = await fetchJobsPage(page, pageSize, signal)
    for (const job of response.items) jobsById.set(job.job_id, job)

    totalPages = Math.max(totalPages, response.total_pages)
    page += 1
  }

  return [...jobsById.values()]
}

export function searchGames(
  term: string,
  signal?: AbortSignal
): Promise<SearchResult<GameSearchResult>> {
  const query = new URLSearchParams({ term, limit: '20' })
  return requestJson<SearchResult<GameSearchResult>>(`/api/steam/games?${query}`, { signal })
}

export function queueJob(gameId: number, jobType: JobType): Promise<Job> {
  return requestJson<Job>('/api/jobs/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_id: gameId, job_type: jobType }),
  })
}

export function deleteJob(jobId: string): Promise<void> {
  return requestJson<void>(`/api/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' })
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof AdminApiError && error.status === 401
}
