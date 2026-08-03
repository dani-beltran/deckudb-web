import { createStorage, prefixStorage } from 'unstorage'
import memoryDriver from 'unstorage/drivers/memory'
import { vi } from 'vitest'
import { getEnvConfig } from '../server/config/env'

// Mock the useRuntimeConfig for testing the server-side code.
// Server side tests don't use Nuxt's context and thus don't have access to
// useRuntimeConfig, so we need to mock it.
// The mock will use the env variables prefixed with NUXT_ in env.test file
vi.mock('#imports', () => ({ useRuntimeConfig: getEnvConfig }))

// Mock Nuxt's unstorage for testing the server-side code using an in-memory storage.
// This allows us to test the session middleware without needing a real database or storage backend.

const storage = createStorage()
storage.mount('mongo', memoryDriver())

const useStorage = (base = '') => (base ? prefixStorage(storage, base) : storage)

vi.mock('nitropack/runtime/internal/storage', () => ({ useStorage }))

