import { createError, defineEventHandler, getRequestHeader, readRawBody, sendWebResponse } from 'h3'
import { getSentryTunnelTarget } from '../utils/sentry-tunnel'

const UPSTREAM_HEADERS_TIMEOUT_MS = 10_000

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
  const controller = new AbortController()
  const abortOnDisconnect = () => {
    if (!event.node.res.writableFinished) controller.abort()
  }
  event.node.res.once('close', abortOnDisconnect)
  if (event.node.res.destroyed) abortOnDisconnect()

  // Bound the wait for headers, while allowing the response body to stream afterward.
  const headersTimeout = setTimeout(() => controller.abort(), UPSTREAM_HEADERS_TIMEOUT_MS)
  try {
    let response: Response
    try {
      response = await fetch(target, {
        method: 'POST',
        body: new Uint8Array(envelope).buffer,
        headers: contentType ? { 'content-type': contentType } : undefined,
        signal: controller.signal,
      })
    } catch (error) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Failed to forward Sentry envelope',
        cause: error,
      })
    } finally {
      clearTimeout(headersTimeout)
    }

    // Keep disconnect cancellation attached until streaming finishes or fails.
    return await sendWebResponse(event, response)
  } catch (error) {
    // A disconnected client cannot receive an error response; cancellation is expected.
    if (controller.signal.aborted && event.node.res.destroyed) return
    throw error
  } finally {
    event.node.res.off('close', abortOnDisconnect)
  }
})
