import { ApiError } from './ApiError'
import type { ApiFetchError } from './types'

export function throwApiError(error: unknown): never {
  const abortError = getAbortError(error)
  if (abortError) throw abortError
  throw ApiError.from(error)
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401
}

function getAbortError(error: unknown): Error | undefined {
  if (error instanceof Error && error.name === 'AbortError') return error
  if (!(error instanceof Error)) return undefined

  const cause = (error as ApiFetchError).cause
  return cause instanceof Error && cause.name === 'AbortError' ? cause : undefined
}
