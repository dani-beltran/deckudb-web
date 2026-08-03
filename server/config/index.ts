import { useRuntimeConfig } from '#imports'
import type { BackendConfig } from './config.schema'
import { configSchema } from './config.schema'

export const getBackendConfig = (): BackendConfig => configSchema.parse(useRuntimeConfig())
export type { BackendConfig } from './config.schema'
export { configSchema } from './config.schema'
