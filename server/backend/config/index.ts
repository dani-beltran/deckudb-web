import { useRuntimeConfig } from '#imports'
import type { BackendConfig } from './configSchema'
import { configSchema } from './configSchema'

export const getBackendConfig = (): BackendConfig => configSchema.parse(useRuntimeConfig())
export type { BackendConfig } from './configSchema'
export { configSchema } from './configSchema'
