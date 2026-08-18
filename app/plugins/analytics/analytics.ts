import type { AnalyticsGame, AnalyticsParameters, GtagProvider } from './analytics.types'

export class Analytics {
  constructor(private readonly getGtag: GtagProvider = () => window.gtag) {}

  trackSearch(
    searchTerm: string,
    searchType = 'game_search',
    additionalParams: AnalyticsParameters = {}
  ): void {
    this.trackEvent('search', {
      search_term: searchTerm,
      search_type: searchType,
      event_category: 'search_interaction',
      ...additionalParams,
    })
  }

  trackSearchInput(
    searchTerm: string,
    searchLength: number,
    searchType = 'game_search_input'
  ): void {
    this.trackEvent('search_input', {
      search_term: searchTerm,
      search_length: searchLength,
      search_type: searchType,
      event_category: 'search_interaction',
    })
  }

  trackSuggestionSelect(suggestionText: string, suggestionIndex: number, searchTerm: string): void {
    this.trackEvent('select_suggestion', {
      suggestion_text: suggestionText,
      suggestion_index: suggestionIndex,
      original_search_term: searchTerm,
      event_category: 'search_interaction',
    })
  }

  trackGameSelect(game: AnalyticsGame, selectionMethod = 'search_result'): void {
    this.trackEvent('select_game', {
      game_id: game.id,
      game_name: game.name,
      selection_method: selectionMethod,
      event_category: 'search_interaction',
    })
  }

  trackShowMoreResults(searchTerm: string, totalResults: number, initiallyShown: number): void {
    this.trackEvent('show_more_results', {
      search_term: searchTerm,
      total_results: totalResults,
      initially_shown: initiallyShown,
      event_category: 'search_interaction',
    })
  }

  trackSearchResults(
    searchTerm: string,
    resultsCount: number,
    hasResults: boolean,
    searchType = 'game_search'
  ): void {
    this.trackEvent('search_results', {
      search_term: searchTerm,
      results_count: resultsCount,
      search_type: searchType,
      has_results: hasResults,
      event_category: 'search_interaction',
    })
  }

  trackSearchError(searchTerm: string, errorMessage: string, searchType = 'game_search'): void {
    this.trackEvent('search_error', {
      search_term: searchTerm,
      error_message: errorMessage,
      search_type: searchType,
      event_category: 'search_interaction',
    })
  }

  trackTabClick(
    tabId: string,
    tabLabel: string,
    context = 'game_settings',
    additionalParams: AnalyticsParameters = {}
  ): void {
    this.trackEvent('tab_click', {
      tab_id: tabId,
      tab_label: tabLabel,
      tab_context: context,
      event_category: 'game_interaction',
      ...additionalParams,
    })
  }

  trackCustomEvent(eventName: string, parameters?: AnalyticsParameters): void {
    this.trackEvent(eventName, parameters)
  }

  private trackEvent(eventName: string, parameters?: AnalyticsParameters): void {
    this.getGtag()?.('event', eventName, parameters)
  }
}
