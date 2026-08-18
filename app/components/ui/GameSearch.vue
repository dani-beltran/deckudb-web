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

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useNuxtApp, useRouter } from '#imports'
import recentGamesStore from '../../stores/recentGamesStore'
import { isMobile } from '../../utils/deviceUtils'
import SearchBar from '../common/SearchBar.vue'
import SearchSuggestions from '../common/SearchSuggestions.vue'
import type { GameId, SearchGame, SearchGamesResponse } from './types'

defineOptions({ name: 'GameSearch' })

type SearchSubmitSource = 'search_bar_button' | 'enter_key'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    loading?: boolean
  }>(),
  {
    modelValue: '',
    loading: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
}>()

const { $analytics, $backendApi } = useNuxtApp()
const router = useRouter()

const gameSearchSubmitted = ref(false)
const showRecentGames = ref(false)
const suggestions = ref<SearchGame[]>([])
const suggestionsLoading = ref(false)
const showSuggestions = ref(false)
const selectedSuggestionIndex = ref(-1)
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const inputTrackingTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

const getRecentSearchedGameIds = (): GameId[] => recentGamesStore.getRecentGames()

const getRecentGames = async (): Promise<SearchGame[]> => {
  const recentIds = getRecentSearchedGameIds()

  if (recentIds.length === 0) {
    return []
  }

  try {
    const result = (await $backendApi.fetchSteamGamesByIds(recentIds)) as SearchGamesResponse
    return result.items || []
  } catch (error) {
    console.warn('Error fetching recent games by IDs:', error)
    return []
  }
}

const showRecentGamesAsSuggestions = async (): Promise<void> => {
  try {
    suggestions.value = await getRecentGames()
    showSuggestions.value = suggestions.value.length > 0
    selectedSuggestionIndex.value = -1
    showRecentGames.value = true
  } catch (error) {
    console.warn('Error fetching recent games by IDs:', error)
    suggestions.value = []
    showSuggestions.value = false
    showRecentGames.value = false
  }
}

// When SearchBar is focused, show recent games as suggestions if input is empty.
const onSearchBarFocus = async (): Promise<void> => {
  if (isMobile()) {
    // Don't show suggestions on mobile devices
    return
  }
  if (props.modelValue.trim().length > 0) {
    // If there's input, show suggestions as usual
    showSuggestions.value = suggestions.value.length > 0
    return
  }
  await showRecentGamesAsSuggestions()
}

const hideSuggestions = (): void => {
  showSuggestions.value = false
  showRecentGames.value = false
  selectedSuggestionIndex.value = -1
}

const handleSearch = async (submitSource: SearchSubmitSource): Promise<void> => {
  if (submitSource === 'enter_key' && selectedSuggestionIndex.value !== -1) {
    // Suggestion selected with enter key, avoid search
    return
  }
  gameSearchSubmitted.value = true
  hideSuggestions()
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  // Track the search event
  $analytics.trackSearch(props.modelValue, 'game_search', {
    search_source: submitSource,
  })
  emit('search', props.modelValue)
}

const debounceTrackInput = (): void => {
  // Clear existing timeout
  if (inputTrackingTimeout.value) {
    clearTimeout(inputTrackingTimeout.value)
  }

  // Set new timeout to track input after 1 second of inactivity
  inputTrackingTimeout.value = setTimeout(() => {
    if (props.modelValue && props.modelValue.trim().length > 0) {
      $analytics.trackSearchInput(
        props.modelValue.trim(),
        props.modelValue.trim().length,
        'game_search_input'
      )
    }
  }, 1000)
}

const fetchSuggestions = async (): Promise<void> => {
  if (!props.modelValue.trim() || props.modelValue.trim().length < 2) {
    await showRecentGamesAsSuggestions()
    return
  }

  suggestionsLoading.value = true

  try {
    const result = (await $backendApi.searchSteamGamesByName(
      props.modelValue.trim(),
      7
    )) as SearchGamesResponse
    // Only show suggestions if the search hasn't been submitted
    suggestions.value = gameSearchSubmitted.value ? [] : result.items || []
    showSuggestions.value = suggestions.value.length > 0
    selectedSuggestionIndex.value = -1
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    suggestions.value = []
    showSuggestions.value = false
  } finally {
    suggestionsLoading.value = false
  }
}

const debouncedFetchSuggestions = (): void => {
  // Clear existing timer
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }

  // Set new timer for 300ms delay
  debounceTimer.value = setTimeout(() => {
    void fetchSuggestions()
  }, 300)
}

const onGameNameInput = (): void => {
  gameSearchSubmitted.value = false
  showRecentGames.value = false

  // Track search input with debouncing to avoid too many events
  debounceTrackInput()

  // Trigger suggestions with debouncing (only on non-mobile devices)
  if (!isMobile()) {
    debouncedFetchSuggestions()
  }
}

const saveRecentSearchedGameId = (gameId: GameId): void => {
  recentGamesStore.saveRecentSearchedGameId(gameId)
}

const selectSuggestion = async (suggestion: SearchGame): Promise<void> => {
  saveRecentSearchedGameId(suggestion.id)
  $analytics.trackSuggestionSelect(
    suggestion.name,
    selectedSuggestionIndex.value,
    props.modelValue.trim()
  )
  // Route directly to the game page using the suggestion ID
  await router.push(`/game/${suggestion.id}`)
}

const delayedHideSuggestions = (): void => {
  // Delay hiding suggestions to allow click events to register
  setTimeout(() => {
    hideSuggestions()
  }, 200)
}

onBeforeUnmount(() => {
  // Clean up debounce timer
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
  // Clean up input tracking timeout
  if (inputTrackingTimeout.value) {
    clearTimeout(inputTrackingTimeout.value)
  }
  suggestions.value = []
})
</script>

<style scoped>
.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
}
</style>
