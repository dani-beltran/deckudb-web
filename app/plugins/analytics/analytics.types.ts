export type AnalyticsParameter = string | number | boolean | null | undefined
export type AnalyticsParameters = Record<string, AnalyticsParameter>

export type Gtag = (command: 'event', eventName: string, parameters?: AnalyticsParameters) => void
export type GtagProvider = () => Gtag | undefined

export interface AnalyticsGame {
  id: string | number
  name: string
}

declare global {
  interface Window {
    gtag?: Gtag
  }
}
