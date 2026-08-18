export type JobStatus = 'queued' | 'in_progress' | 'completed' | 'failed'

export type JobType = 'search' | 'scrape' | 'reports' | 'summary' | 'full'

export interface Job {
  job_id: string
  job_type: JobType
  game_id: number
  game_name?: string
  status: JobStatus
  attempt_count?: number
  max_attempts?: number
  started_at: string | null
  completed_at: string | null
  status_message?: string
  created_at: string
  updated_at: string
}

export interface GameSearchResult {
  id: number
  name: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface SearchResult<T> {
  items: T[]
  total: number
}

export interface AdminSession {
  authenticated: boolean
  username?: string
}

export type ApiErrorBody = {
  error?: unknown
  message?: unknown
  statusMessage?: unknown
  data?: { error?: unknown; message?: unknown }
}

export type ApiFetchError = Error & {
  cause?: unknown
  data?: unknown
  response?: {
    status?: number
    statusText?: string
    _data?: unknown
  }
  status?: number
  statusCode?: number
  statusText?: string
}
