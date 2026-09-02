import {
  createError,
  getQuery,
  type H3Event,
  readBody,
  setResponseHeader,
  setResponseStatus,
} from 'h3'
import { ZodError, type ZodType } from 'zod'
import { isAdminAuthenticated } from './admin-auth'
import { ConflictError } from './errors/ConflictError'
import { NotFoundError } from './errors/NotFoundError'
import { toError } from './errors/toError'
import { ValidationError } from './errors/ValidationError'
import logger from './logger'

function invalidRequest(error: ZodError, target: string) {
  return {
    error: `Invalid request ${target}`,
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  }
}

export async function parseBody<T>(
  event: Parameters<typeof readBody>[0],
  schema: ZodType<T>,
  inspectBody?: (body: unknown) => void
) {
  try {
    const body: unknown = await readBody(event)
    inspectBody?.(body)
    return await schema.parseAsync(body)
  } catch (error) {
    if (error instanceof ZodError) {
      throw createHttpError(400, invalidRequest(error, 'body'))
    }
    throw error
  }
}

export async function parseQuery<T>(event: Parameters<typeof getQuery>[0], schema: ZodType<T>) {
  try {
    return await schema.parseAsync(getQuery(event))
  } catch (error) {
    if (error instanceof ZodError) {
      throw createHttpError(400, invalidRequest(error, 'query parameters'))
    }
    throw error
  }
}

export async function parseParams<T>(params: unknown, schema: ZodType<T>) {
  try {
    return await schema.parseAsync(params)
  } catch (error) {
    if (error instanceof ZodError) {
      throw createHttpError(400, invalidRequest(error, 'parameters'))
    }
    throw error
  }
}

/** Requires an authenticated admin session. */
export function requireAdmin(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (isAdminAuthenticated(event)) return
  throw createHttpError(401, { error: 'Unauthorized' })
}

export function getSessionId(event: H3Event) {
  const sessionId = event.context.session?.id
  if (!sessionId) throw new Error('Session middleware is not configured')
  return sessionId
}

export function noContent(event: Parameters<typeof setResponseStatus>[0]) {
  setResponseStatus(event, 204)
  return null
}

function createHttpError(statusCode: number, data: Record<string, unknown>, cause?: unknown) {
  return createError({ statusCode, statusMessage: data.error as string, data, cause })
}

export async function apiHandler<T>(
  event: Parameters<typeof setResponseStatus>[0],
  handler: () => Promise<T>
) {
  try {
    const res = await handler()
    if (res === undefined) {
      return noContent(event)
    }
    return res
  } catch (error) {
    if (error instanceof NotFoundError) throw createHttpError(404, { error: error.message })
    if (error instanceof ValidationError) {
      throw createHttpError(400, { error: error.message, details: error.details })
    }
    if (error instanceof ConflictError) throw createHttpError(409, { error: error.message })
    if (typeof error === 'object' && error && 'statusCode' in error) throw error

    const exception = toError(error)
    logger.error('Server error:', exception)
    // Keep the API response generic while retaining the captured original as the cause.
    throw createHttpError(500, { error: 'Internal server error' }, exception)
  }
}
