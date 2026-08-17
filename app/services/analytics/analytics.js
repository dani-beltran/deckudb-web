/**
 * Google Analytics tracking utilities
 */

/**
 * Track search events in Google Analytics
 * @param {string} searchTerm - The search term entered by the user
 * @param {string} searchType - Type of search (e.g., 'game_search', 'suggestion_search')
 * @param {Object} additionalParams - Additional parameters to track
 */
export function trackSearch(searchTerm, searchType = 'game_search', additionalParams = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm,
      search_type: searchType,
      event_category: 'search_interaction',
      ...additionalParams,
    })
  }
}

/**
 * Track search input events (when user types in search bar)
 * @param {string} searchTerm - The current search term
 * @param {number} searchLength - Length of the search term
 * @param {string} searchType - Type of search input
 */
export function trackSearchInput(searchTerm, searchLength, searchType = 'game_search_input') {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search_input', {
      search_term: searchTerm,
      search_length: searchLength,
      search_type: searchType,
      event_category: 'search_interaction',
    })
  }
}

/**
 * Track suggestion selection events
 * @param {string} suggestionText - The selected suggestion text
 * @param {number} suggestionIndex - Index of the selected suggestion
 * @param {string} searchTerm - Original search term that triggered suggestions
 */
export function trackSuggestionSelect(suggestionText, suggestionIndex, searchTerm) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'select_suggestion', {
      suggestion_text: suggestionText,
      suggestion_index: suggestionIndex,
      original_search_term: searchTerm,
      event_category: 'search_interaction',
    })
  }
}

/**
 * Track game selection events
 * @param {Object} game - The selected game object
 * @param {string} selectionMethod - How the game was selected (e.g., 'search_result', 'suggestion')
 */
export function trackGameSelect(game, selectionMethod = 'search_result') {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'select_game', {
      game_id: game.id,
      game_name: game.name,
      selection_method: selectionMethod,
      event_category: 'search_interaction',
    })
  }
}

/**
 * Track show more results events
 * @param {string} searchTerm - The search term
 * @param {number} totalResults - Total number of results available
 * @param {number} initiallyShown - Number of results shown initially
 * @param {string} eventCategory - Event category
 */
export function trackShowMoreSearchResults(searchTerm, totalResults, initiallyShown) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'show_more_results', {
      search_term: searchTerm,
      total_results: totalResults,
      initially_shown: initiallyShown,
      event_category: 'search_interaction',
    })
  }
}

/**
 * Track search results events
 * @param {string} searchTerm - The search term
 * @param {number} resultsCount - Total number of results found
 * @param {boolean} hasResults - Whether any results were found
 * @param {string} searchType - Type of search
 */
export function trackSearchResults(
  searchTerm,
  resultsCount,
  hasResults,
  searchType = 'game_search'
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search_results', {
      search_term: searchTerm,
      results_count: resultsCount,
      search_type: searchType,
      has_results: hasResults,
      event_category: 'search_interaction',
    })
  }
}

/**
 * Track search error events
 * @param {string} searchTerm - The search term that caused the error
 * @param {string} errorMessage - The error message
 * @param {string} searchType - Type of search that failed
 */
export function trackSearchError(searchTerm, errorMessage, searchType = 'game_search') {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search_error', {
      search_term: searchTerm,
      error_message: errorMessage,
      search_type: searchType,
      event_category: 'search_interaction',
    })
  }
}

/**
 * Track tab click events
 * @param {string} tabId - The ID of the clicked tab
 * @param {string} tabLabel - The label/name of the clicked tab
 * @param {string} context - The context where the tab was clicked (e.g., 'game_settings')
 * @param {Object} additionalParams - Additional parameters to track
 */
export function trackTabClick(tabId, tabLabel, context = 'game_settings', additionalParams = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'tab_click', {
      tab_id: tabId,
      tab_label: tabLabel,
      tab_context: context,
      event_category: 'game_interaction',
      ...additionalParams,
    })
  }
}

/**
 * Track general custom events
 * @param {string} eventName - Name of the event
 * @param {Object} parameters - Event parameters
 */
export function trackCustomEvent(eventName, parameters = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters)
  }
}
