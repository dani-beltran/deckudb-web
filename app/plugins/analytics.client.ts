import { defineNuxtPlugin } from '#imports'
import { Analytics } from './analytics/analytics'

export { Analytics } from './analytics/analytics'
export type {
  AnalyticsGame,
  AnalyticsParameter,
  AnalyticsParameters,
  Gtag,
  GtagProvider,
} from './analytics/analytics.types'

export default defineNuxtPlugin(() => ({
  provide: {
    analytics: new Analytics(),
  },
}))
