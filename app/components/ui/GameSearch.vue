<template>
    <div class="search-wrapper">
      <SearchBar
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        placeholder="Enter game name..."
        :loading="loading"
        :show-suggestions="showSuggestions"
        @search="handleSearch"
        @input="onGameNameInput"
        @blur="delayedHideSuggestions"
        @focus="onSearchBarFocus"
        aria-label="Search for Steam Deck game settings"
      >
        <!-- Suggestions Dropdown -->
        <SearchSuggestions
          :suggestions="suggestions"
          :loading="suggestionsLoading"
          :selected-index="selectedSuggestionIndex"
          :title="showRecentGames ? 'Recent Games Searched' : 'Game Suggestions'"
          @select-suggestion="selectSuggestion"
          @update-selected-index="selectedSuggestionIndex = $event"
          @close-suggestions="hideSuggestions"
        />
      </SearchBar>
    </div>
</template>

<script>
import { trackSearch, trackSearchInput, trackSuggestionSelect } from '../../services/analytics'
import recentGamesStore from '../../stores/recentGamesStore.js'
import { isMobile } from '../../utils/deviceUtils.js'
import Button from '../base/Button.vue'
import SearchBar from '../common/SearchBar.vue'
import SearchSuggestions from '../common/SearchSuggestions.vue'

export default {
  name: 'GameSearch',
  components: {
    Button,
    SearchBar,
    SearchSuggestions,
  },
  emits: ['update:modelValue', 'search'],
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      gameSearchResults: [],
      gameSearchSubmitted: false,
      showRecentGames: false,
      suggestions: [],
      suggestionsLoading: false,
      showSuggestions: false,
      selectedSuggestionIndex: -1,
      debounceTimer: null,
      inputTrackingTimeout: null,
    }
  },
  methods: {
    // When SearchBar is focused, show recent games as suggestions if input is empty.
    async onSearchBarFocus() {
      if (isMobile()) {
        // Don't show suggestions on mobile devices
        return
      }
      if (this.modelValue.trim().length > 0) {
        // If there's input, show suggestions as usual
        this.showSuggestions = this.suggestions.length > 0
        return
      }
      await this.showRecentGamesAsSuggestions()
    },

    async showRecentGamesAsSuggestions() {
      try {
        this.suggestions = await this.getRecentGames()
        this.showSuggestions = this.suggestions.length > 0
        this.selectedSuggestionIndex = -1
        this.showRecentGames = true
      } catch (e) {
        console.warn('Error fetching recent games by IDs:', e)
        this.suggestions = []
        this.showSuggestions = false
        this.showRecentGames = false
      }
    },

    async getRecentGames() {
      const recentIds = this.getRecentSearchedGameIds()

      if (recentIds.length === 0) {
        return []
      }

      try {
        const result = await this.$backendApi.fetchSteamGamesByIds(recentIds)
        return result.items || []
      } catch (e) {
        console.warn('Error fetching recent games by IDs:', e)
        return []
      }
    },

    getRecentSearchedGameIds() {
      return recentGamesStore.getRecentGames()
    },

    async handleSearch(submitSource) {
      if (submitSource === 'enter_key' && this.selectedSuggestionIndex !== -1) {
        // Suggestion selected with enter key, avoid search
        return
      }
      this.gameSearchSubmitted = true
      this.hideSuggestions()
      clearTimeout(this.debounceTimer)
      // Track the search event
      trackSearch(this.modelValue, 'game_search', {
        search_source: submitSource,
      })
      this.$emit('search', this.modelValue)
    },

    onGameNameInput() {
      this.gameSearchSubmitted = false
      this.showRecentGames = false

      // Track search input with debouncing to avoid too many events
      this.debounceTrackInput()

      // Trigger suggestions with debouncing (only on non-mobile devices)
      if (!isMobile()) {
        this.debouncedFetchSuggestions()
      }
    },

    debounceTrackInput() {
      // Clear existing timeout
      if (this.inputTrackingTimeout) {
        clearTimeout(this.inputTrackingTimeout)
      }

      // Set new timeout to track input after 1 second of inactivity
      this.inputTrackingTimeout = setTimeout(() => {
        if (this.modelValue && this.modelValue.trim().length > 0) {
          trackSearchInput(
            this.modelValue.trim(),
            this.modelValue.trim().length,
            'game_search_input'
          )
        }
      }, 1000)
    },

    debouncedFetchSuggestions() {
      // Clear existing timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }

      // Set new timer for 300ms delay
      this.debounceTimer = setTimeout(() => {
        this.fetchSuggestions()
      }, 300)
    },

    async fetchSuggestions() {
      if (!this.modelValue.trim() || this.modelValue.trim().length < 2) {
        await this.showRecentGamesAsSuggestions()
        return
      }

      this.suggestionsLoading = true

      try {
        const suggestions = await this.$backendApi.searchSteamGamesByName(this.modelValue.trim(), 7)
        // Only show suggestions if the search hasn't been submitted
        this.suggestions = this.gameSearchSubmitted ? [] : suggestions.items || []
        this.showSuggestions = this.suggestions.length > 0
        this.selectedSuggestionIndex = -1
      } catch (error) {
        console.error('Error fetching suggestions:', error)
        this.suggestions = []
        this.showSuggestions = false
      } finally {
        this.suggestionsLoading = false
      }
    },

    async selectSuggestion(suggestion) {
      this.saveRecentSearchedGameId(suggestion.id)
      trackSuggestionSelect(suggestion.name, this.selectedSuggestionIndex, this.modelValue.trim())
      // Route directly to the game page using the suggestion ID
      this.$router.push(`/game/${suggestion.id}`)
    },

    hideSuggestions() {
      this.showSuggestions = false
      this.showRecentGames = false
      this.selectedSuggestionIndex = -1
    },

    delayedHideSuggestions() {
      // Delay hiding suggestions to allow click events to register
      setTimeout(() => {
        this.hideSuggestions()
      }, 200)
    },

    saveRecentSearchedGameId(gameId) {
      recentGamesStore.saveRecentSearchedGameId(gameId)
    },
  },
  beforeUnmount() {
    // Clean up debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    // Clean up input tracking timeout
    if (this.inputTrackingTimeout) {
      clearTimeout(this.inputTrackingTimeout)
    }
    this.suggestions = []
  },
}
</script>

<style scoped>
.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
}
</style>
