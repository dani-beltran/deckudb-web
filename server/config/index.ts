import { useRuntimeConfig } from '#imports'
import type { ServerConfig } from './config.schema'
import { configSchema } from './config.schema'

export type { ServerConfig } from './config.schema'

/**
 * Retrieves the server configuration from Nuxt's runtimeConfig and validates it against the configSchema.
 * @throws {ZodError} If the configuration does not match the schema.
 * @returns The validated server configuration.
 */
export const getServerConfig = (): ServerConfig => configSchema.parse(useRuntimeConfig())
