/**
 * Analytics service exports
 *
 * This file provides a clean interface for importing analytics functions
 */

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
} from './analytics.js'
