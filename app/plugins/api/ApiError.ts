import type { ApiErrorBody, ApiFetchError } from './types'

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, options: { cause?: unknown; status?: number } = {}) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.status = options.status
  }

  static from(error: unknown, fallback = 'API request failed'): ApiError {
    if (error instanceof ApiError) return error

    const fetchError =
      typeof error === 'object' && error !== null ? (error as Partial<ApiFetchError>) : {}
    const status = fetchError.response?.status ?? fetchError.statusCode ?? fetchError.status
    const rawPayload = fetchError.response?._data ?? fetchError.data
    const payload =
      typeof rawPayload === 'object' && rawPayload !== null
        ? (rawPayload as ApiErrorBody)
        : undefined
    const detail =
      payload?.data?.error ?? payload?.error ?? payload?.statusMessage ?? payload?.message
    const statusText = fetchError.response?.statusText ?? fetchError.statusText

    let message = fallback
    if (typeof detail === 'string' && detail.trim()) {
      message = detail
    } else if (typeof status === 'number') {
      message = `Request failed (${status}${statusText ? ` ${statusText}` : ''})`
    } else if (error instanceof Error && error.message) {
      message = error.message
    }

    return new ApiError(message, {
      cause: error,
      status: typeof status === 'number' ? status : undefined,
    })
  }
}
