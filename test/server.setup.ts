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

vi.mock('@server/services/claude/ClaudeService', () => ({
  default: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn(),
  })),
}))
