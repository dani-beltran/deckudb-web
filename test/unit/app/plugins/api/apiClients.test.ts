import { AdminApi } from '@app/plugins/api/AdminApi'
import { ApiError } from '@app/plugins/api/ApiError'
import { BackendApi } from '@app/plugins/api/BackendApi'
import type { $Fetch } from 'nitropack/types'
import { describe, expect, it, vi } from 'vitest'

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

  it('sends audit-log pagination and filters to the protected viewer endpoint', async () => {
    const response = { items: [], total: 0, page: 2, page_size: 50, total_pages: 0 }
    const api = vi.fn().mockResolvedValue(response)
    const signal = new AbortController().signal

    await expect(
      new AdminApi(asFetch(api)).fetchAuditLogs(
        {
          page: 2,
          page_size: 50,
          user_identity: 'admin',
          action_type: 'job_delete',
          date_from: '2026-08-01',
          date_to: '2026-08-31',
        },
        signal
      )
    ).resolves.toEqual(response)

    expect(api).toHaveBeenCalledWith('/admin/audit-logs', {
      cache: 'no-store',
      query: {
        page: 2,
        page_size: 50,
        user_identity: 'admin',
        action_type: 'job_delete',
        date_from: '2026-08-01',
        date_to: '2026-08-31',
      },
      signal,
    })
  })

  it('preserves abort errors instead of wrapping them', async () => {
    const abortError = new Error('Request aborted')
    abortError.name = 'AbortError'
    const api = vi.fn().mockRejectedValue(new Error('Fetch failed', { cause: abortError }))

    await expect(new BackendApi(asFetch(api)).fetchGame(42)).rejects.toBe(abortError)
  })
})
