import { createError, defineEventHandler, getRequestHeader, readRawBody, sendWebResponse } from 'h3'
import { getSentryTunnelTarget } from '../utils/sentry-tunnel'

export default defineEventHandler(async (event) => {
  const configuredDsn = process.env.NUXT_PUBLIC_SENTRY_DSN
  if (!configuredDsn) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Sentry tunnel is not configured',
    })
  }

  const envelope = await readRawBody(event, false)
  if (!envelope?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Sentry envelope is required',
    })
  }

  let target: string
  try {
    target = getSentryTunnelTarget(envelope, configuredDsn)
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Sentry envelope',
      cause: error,
    })
  }

  const contentType = getRequestHeader(event, 'content-type')
  let response: Response
  try {
    response = await fetch(target, {
      method: 'POST',
      body: new Uint8Array(envelope).buffer,
      headers: contentType ? { 'content-type': contentType } : undefined,
    })
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to forward Sentry envelope',
      cause: error,
    })
  }

  return sendWebResponse(event, response)
})
