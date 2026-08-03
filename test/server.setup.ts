import { vi } from 'vitest'
import { configSchema } from '../server/config/config.schema'
import { camelCaseToSnakeCase } from '../shared/string'

// Mock the useRuntimeConfig for testing the server-side code.
// Server side tests don't use Nuxt's context and thus don't have access to 
// useRuntimeConfig, so we need to mock it.
// The mock will use the env variables prefixed with NUXT_ in env.test file

const CONFIG_KEYS = Object.keys(configSchema.shape);

const getRuntimeConfig = () => {
  const config: Record<string, string | undefined> = {}

  for (const key of CONFIG_KEYS) {
    config[key] = process.env[`NUXT_${camelCaseToSnakeCase(key).toUpperCase()}`]
  }
  return config
}

vi.mock('#imports', () => ({
  useRuntimeConfig: getRuntimeConfig,
}))
