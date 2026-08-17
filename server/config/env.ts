import { camelCaseToSnakeCase } from '../../shared/string'
import { configSchema } from './config.schema'

/**
 * Retrieves the server configuration from environment variables.
 * It only includes the env variables that are defined in the config schema.
 * The variables in the config schema are expected to be in camelCase, while the
 * environment variables are expected to be in SCREAMING_SNAKE_CASE.
 * @returns
 */
export function getEnvConfig(): Record<string, string | undefined> {
  const configKeys = Object.keys(configSchema.shape)
  const config: Record<string, string | undefined> = {}

  for (const key of configKeys) {
    const envVarName = camelCaseToSnakeCase(key).toUpperCase()
    // Nuxt prefixed environment variables take precedence over unprefixed ones.
    // This is the same behavior as Nuxt's useRuntimeConfig.
    config[key] = process.env[`NUXT_${envVarName}`] ?? process.env[envVarName]
  }

  return config
}
