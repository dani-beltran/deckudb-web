import { FirecrawlService, type FirecrawlWebResult } from '@server/services/firecrawl'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const makeMockResult = (overrides: Partial<FirecrawlWebResult> = {}): FirecrawlWebResult => ({
  title: 'Test Page',
  description: 'A test page',
  url: 'https://example.com/test',
  ...overrides,
})

describe('FirecrawlService', () => {
  let service: FirecrawlService

  beforeAll(() => {
    global.fetch = vi.fn()

    vi.mock('@server/utils/logger', () => ({
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    }))
  })

  beforeEach(() => {
    vi.clearAllMocks()

    service = new FirecrawlService('test-api-key')
  })

  describe('search', () => {
    it('should make a POST request to the correct URL', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { web: [] } }),
      })

      await service.search({ query: 'Elden Ring steam deck best settings' })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v2/search',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should include Authorization header with Bearer token', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { web: [] } }),
      })

      await service.search({ query: 'test' })

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer test-api-key',
        'Content-Type': 'application/json',
      })
    })

    it('should send search params in the request body', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { web: [] } }),
      })

      const params = {
        query: 'test query',
        limit: 3,
        lang: 'en',
        tbs: 'qdr:y',
      }
      await service.search(params)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!
      expect(JSON.parse(options.body)).toEqual(params)
    })

    it('should return the web results array', async () => {
      const mockResults = [
        makeMockResult({ url: 'https://example.com/1' }),
        makeMockResult({ url: 'https://example.com/2' }),
      ]
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { web: mockResults },
        }),
      })

      const results = await service.search({ query: 'test' })

      expect(results).toEqual(mockResults)
    })

    it('should return an empty array when data.web is missing', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      const results = await service.search({ query: 'test' })

      expect(results).toEqual([])
    })

    it('should throw on non-2xx response with API error message', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
      })

      await expect(service.search({ query: 'test' })).rejects.toThrow(
        'Firecrawl API error (401): Invalid API key'
      )
    })

    it('should throw on non-2xx response using statusText as fallback', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => {
          throw new Error('Parse error')
        },
      })

      await expect(service.search({ query: 'test' })).rejects.toThrow(
        'Firecrawl API error (429): Too Many Requests'
      )
    })
  })
})
