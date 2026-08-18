import type { $Fetch } from 'nitropack/types'
import { describe, expect, it, vi } from 'vitest'
import { AdminApi } from '@app/plugins/api/AdminApi'
import { ApiError } from '@app/plugins/api/ApiError'
import { BackendApi } from '@app/plugins/api/BackendApi'

function createHttpError(status: number, message: string) {
  return Object.assign(new Error('Fetch failed'), {
    response: {
      status,
      statusText: 'Service Unavailable',
      _data: { message },
    },
  })
}

function asFetch(mock: ReturnType<typeof vi.fn>): $Fetch {
  return mock as unknown as $Fetch
}

describe('API clients', () => {
  it('normalizes AdminApi failures as ApiError', async () => {
    const api = vi.fn().mockRejectedValue(createHttpError(503, 'Admin API unavailable'))
    const request = new AdminApi(asFetch(api)).deleteJob('job-1')

    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({
      message: 'Admin API unavailable',
      status: 503,
    })
  })

  it('normalizes BackendApi failures as ApiError', async () => {
    const api = vi.fn().mockRejectedValue(createHttpError(503, 'Backend API unavailable'))
    const request = new BackendApi(asFetch(api)).fetchGame(42)

    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({
      message: 'Backend API unavailable',
      status: 503,
    })
  })

  it('uses ApiError for BackendApi input validation', () => {
    const client = new BackendApi(asFetch(vi.fn()))
    expect(() => client.searchSteamGamesByName('')).toThrow(ApiError)
  })

  it('keeps a 401 session response unauthenticated', async () => {
    const api = vi.fn().mockRejectedValue(createHttpError(401, 'Unauthorized'))
    await expect(new AdminApi(asFetch(api)).getAdminSession()).resolves.toEqual({
      authenticated: false,
    })
  })

  it('preserves abort errors instead of wrapping them', async () => {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'
    const api = vi.fn().mockRejectedValue(new Error('Fetch failed', { cause: abortError }))

    await expect(new BackendApi(asFetch(api)).fetchGame(42)).rejects.toBe(abortError)
  })
})
