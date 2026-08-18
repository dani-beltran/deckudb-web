/**
 * Analytics service exports
 *
 * This file provides a clean interface for importing analytics functions
 */

export type { AnalyticsGame, AnalyticsParameter, AnalyticsParameters, Gtag } from './analytics'
export {
  trackCustomEvent,
  trackGameSelect,
  trackSearch,
  trackSearchError,
  trackSearchInput,
  trackSearchResults,
  trackShowMoreSearchResults as trackShowMoreResults,
  trackSuggestionSelect,
  trackTabClick,
} from './analytics'
