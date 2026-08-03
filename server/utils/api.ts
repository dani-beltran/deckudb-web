import { randomUUID } from 'node:crypto'
import {
  createError,
  getCookie,
  getHeader,
  getQuery,
  readBody,
  setCookie,
  setResponseStatus,
} from 'h3'
import { ZodError, type ZodType } from 'zod'
import { useRuntimeConfig } from '#imports'
import { ConflictError } from '../backend/errors/ConflictError'
import { NotFoundError } from '../backend/errors/NotFoundError'
import { ValidationError } from '../backend/errors/ValidationError'
import { bootstrapDependencies, createDBIndexes } from '../backend/lib/bootstrap'
import logger from './logger'

let dependenciesPromise: ReturnType<typeof bootstrapDependencies> | undefined
let indexesPromise: Promise<void> | undefined

export async function useApiDependencies() {
  if (!dependenciesPromise) {
    dependenciesPromise = bootstrapDependencies()
  }

  const bootstrapped = await dependenciesPromise
  if (!indexesPromise) indexesPromise = createDBIndexes(bootstrapped.dependencies)
  await indexesPromise
  return bootstrapped.dependencies
}

function invalidRequest(error: ZodError, target: string) {
  return {
    error: `Invalid request ${target}`,
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  }
}

export async function parseBody<T>(event: Parameters<typeof readBody>[0], schema: ZodType<T>) {
  try {
    return await schema.parseAsync(await readBody(event))
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

export function requireJobApiKey(event: Parameters<typeof getHeader>[0]) {
  const { jobApiKey } = useRuntimeConfig()
  if (!jobApiKey) {
    logger.error('JOB_API_KEY is not configured')
    throw createHttpError(500, { error: 'Internal server error' })
  }

  if (getHeader(event, 'x-api-key') !== jobApiKey) {
    throw createHttpError(401, { error: 'Unauthorized' })
  }
}

export function getSessionId(event: Parameters<typeof getCookie>[0]) {
  const existingSessionId = getCookie(event, 'decku.sid')
  if (existingSessionId) return existingSessionId

  const sessionId = randomUUID()
  const { nodeEnv, sessionMaxAgeMs } = useRuntimeConfig()
  setCookie(event, 'decku.sid', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    maxAge: Math.floor(Number(sessionMaxAgeMs) / 1000),
  })
  return sessionId
}

export function noContent(event: Parameters<typeof setResponseStatus>[0]) {
  setResponseStatus(event, 204)
  return null
}

function createHttpError(statusCode: number, data: Record<string, unknown>) {
  return createError({ statusCode, statusMessage: data.error as string, data })
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

    logger.error('Server error:', error)
    throw createHttpError(500, { error: 'Internal server error' })
  }
}
