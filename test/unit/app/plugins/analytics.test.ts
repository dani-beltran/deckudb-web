import { Analytics } from '@app/plugins/analytics/analytics'
import type { Gtag } from '@app/plugins/analytics/analytics.types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('analytics plugin', () => {
  let gtag: ReturnType<typeof vi.fn<Gtag>>

  beforeEach(() => {
    gtag = vi.fn<Gtag>()
  })

  it('tracks searches with defaults and additional parameters', () => {
    const analytics = new Analytics(() => gtag)

    analytics.trackSearch('Portal 2', undefined, { search_source: 'enter_key' })

    expect(gtag).toHaveBeenCalledWith('event', 'search', {
      search_term: 'Portal 2',
      search_type: 'game_search',
      event_category: 'search_interaction',
      search_source: 'enter_key',
    })
  })

  it('tracks search input', () => {
    const analytics = new Analytics(() => gtag)

    analytics.trackSearchInput('Portal', 6)

    expect(gtag).toHaveBeenCalledWith('event', 'search_input', {
      search_term: 'Portal',
      search_length: 6,
      search_type: 'game_search_input',
      event_category: 'search_interaction',
    })
  })

  it('tracks suggestion selection', () => {
    const analytics = new Analytics(() => gtag)

    analytics.trackSuggestionSelect('Portal 2', 1, 'Portal')

    expect(gtag).toHaveBeenCalledWith('event', 'select_suggestion', {
      suggestion_text: 'Portal 2',
      suggestion_index: 1,
      original_search_term: 'Portal',
      event_category: 'search_interaction',
    })
  })

  it('tracks game selection', () => {
    const analytics = new Analytics(() => gtag)

    analytics.trackGameSelect({ id: 620, name: 'Portal 2' })

    expect(gtag).toHaveBeenCalledWith('event', 'select_game', {
      game_id: 620,
      game_name: 'Portal 2',
      selection_method: 'search_result',
      event_category: 'search_interaction',
    })
  })

  it('tracks requests to show more results', () => {
    const analytics = new Analytics(() => gtag)

    analytics.trackShowMoreResults('Portal', 12, 4)

    expect(gtag).toHaveBeenCalledWith('event', 'show_more_results', {
      search_term: 'Portal',
      total_results: 12,
      initially_shown: 4,
      event_category: 'search_interaction',
    })
  })

  it('tracks search results', () => {
    const analytics = new Analytics(() => gtag)

    analytics.trackSearchResults('Portal', 12, true, 'suggestion_search')

    expect(gtag).toHaveBeenCalledWith('event', 'search_results', {
      search_term: 'Portal',
      results_count: 12,
      search_type: 'suggestion_search',
      has_results: true,
      event_category: 'search_interaction',
    })
  })

  it('tracks search errors', () => {
    const analytics = new Analytics(() => gtag)

    analytics.trackSearchError('Portal', 'Network error')

    expect(gtag).toHaveBeenCalledWith('event', 'search_error', {
      search_term: 'Portal',
      error_message: 'Network error',
      search_type: 'game_search',
      event_category: 'search_interaction',
    })
  })

  it('tracks tab clicks with additional parameters', () => {
    const analytics = new Analytics(() => gtag)

    analytics.trackTabClick('reports', 'Reports', undefined, { game_id: 620 })

    expect(gtag).toHaveBeenCalledWith('event', 'tab_click', {
      tab_id: 'reports',
      tab_label: 'Reports',
      tab_context: 'game_settings',
      event_category: 'game_interaction',
      game_id: 620,
    })
  })

  it('tracks custom events', () => {
    const analytics = new Analytics(() => gtag)

    analytics.trackCustomEvent('test_event', { value: 1 })

    expect(gtag).toHaveBeenCalledWith('event', 'test_event', { value: 1 })
  })

  it('does nothing when gtag is unavailable', () => {
    const analytics = new Analytics(() => undefined)

    expect(() => analytics.trackCustomEvent('test_event')).not.toThrow()
  })
})
