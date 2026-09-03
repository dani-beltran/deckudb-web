import { getEnvConfig } from '@server/config/env'
import { createStorage, prefixStorage } from 'unstorage'
import memoryDriver from 'unstorage/drivers/memory'
import { vi } from 'vitest'

// Mock the useRuntimeConfig for testing the server-side code.
// Server side tests don't use Nuxt's context and thus don't have access to
// useRuntimeConfig, so we need to mock it.
vi.mock('#imports', () => ({ useRuntimeConfig: getEnvConfig }))

// Mock Nuxt's unstorage for testing the server-side code using an in-memory storage.
// This allows us to test the session middleware without needing a real database or storage backend.
const storage = createStorage()
storage.mount('mongo', memoryDriver())

const useStorage = (base = '') => (base ? prefixStorage(storage, base) : storage)

vi.mock('nitropack/runtime/internal/storage', () => ({ useStorage }))

// Mock external services for testing the server-side code without making real network calls.
vi.mock('@server/services/steam/steam', () => ({
  searchSteamGames: vi.fn(),
  getSteamGameDetails: vi.fn(),
  getMostPlayedSteamDeckGameIds: vi.fn(),
  extractAppIdsFromProtobufData: vi.fn(),
  mapGamesToSearchItems: vi.fn(),
  getSteamdeckVerificationStatus: vi.fn(),
}))

vi.mock('@server/services/firecrawl/FirecrawlService', () => ({
  default: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
  })),
}))

vi.mock('@server/services/ai/model', async () => {
  const { simulateReadableStream } = await import('ai')
  const { MockLanguageModelV4 } = await import('ai/test')
  const usage = {
    inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 4, text: 4, reasoning: undefined },
  }

  return {
    createClaudeModel: vi.fn(
      () =>
        new MockLanguageModelV4({
          doGenerate: async () => ({
            content: [{ type: 'text', text: 'Test AI response' }],
            finishReason: { unified: 'stop', raw: undefined },
            usage,
            warnings: [],
          }),
          doStream: async () => ({
            stream: simulateReadableStream({
              chunks: [
                { type: 'text-start', id: 'text-1' },
                { type: 'text-delta', id: 'text-1', delta: 'Test AI response' },
                { type: 'text-end', id: 'text-1' },
                {
                  type: 'finish',
                  finishReason: { unified: 'stop', raw: undefined },
                  logprobs: undefined,
                  usage,
                },
              ],
            }),
          }),
        })
    ),
  }
})
