<template>
  <div class="search-results-page">
    <NavigationHeader 
      v-model:search-term="searchTerm"
      @search="onSearch"
      :loading="searchLoading"
    />

    <!-- Search Results Section -->
    <main class="results-section" aria-label="Search Results">
      <!-- Loading State -->
      <div v-if="searchLoading" class="loading-state">
        <Spinner message="Searching games..." />
      </div>

      <GameSearchResults 
        v-else-if="searchResults.length > 0"
        :results="searchResults"
        :search-term="searchTerm"
        :initial-results-count="initialResultsCount"
        @game-selected="onGameSelected"
      />

      <!-- Empty State -->
      <div v-else-if="searchError" class="empty-state">
        <p>{{ searchError.title }}</p>
        <p class="empty-hint">{{ searchError.message }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useNuxtApp, useRoute, useRouter } from '#imports'
import Spinner from '../components/base/Spinner.vue'
import GameSearchResults from '../components/ui/GameSearchResults.vue'
import NavigationHeader from '../components/ui/NavigationHeader.vue'
import type { SearchGame, SearchGamesResponse } from '../components/ui/types'

interface SearchError {
  title: string
  message: string
}

defineOptions({ name: 'SearchResults' })

const { $backendApi } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const searchResults = ref<SearchGame[]>([])
const searchLoading = ref(false)
const searchError = ref<SearchError | null>(null)
const searchTerm = ref('')
const isWideScreen = ref(false)

function normalizeQueryValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''

  const firstValue = value[0]
  return typeof firstValue === 'string' ? firstValue : ''
}

const initialResultsCount = computed<number>(() => (isWideScreen.value ? 8 : 4))

const onSearch = async (term?: string): Promise<void> => {
  if (!term?.trim()) {
    searchError.value = {
      title: 'No search term entered',
      message: 'Please enter a game name into the search bar.',
    }
    return
  }

  searchLoading.value = true
  searchError.value = null
  searchResults.value = []

  try {
    const results = (await $backendApi.searchSteamGamesByName(term.trim())) as SearchGamesResponse
    searchResults.value = results.items || []
    if (searchResults.value.length === 0) {
      searchError.value = {
        title: 'No games found with that name',
        message: 'Try a different search term or check the spelling.',
      }
    }
  } catch (err) {
    console.error('Error searching for games:', err)
    searchError.value = {
      title: 'Error searching for games',
      message: 'An error occurred while searching. Please try again later.',
    }
  } finally {
    searchLoading.value = false
  }
}

const onGameSelected = (game: SearchGame): void => {
  void router.push({
    name: 'Game',
    params: { gameId: game.steam_appid ?? game.id },
  })
}

const updateUrl = (): void => {
  const currentQuery = normalizeQueryValue(route.query.q)
  if (searchTerm.value !== currentQuery) {
    void router.replace({
      name: 'SearchResults',
      query: searchTerm.value.trim() ? { q: searchTerm.value.trim() } : {},
    })
  }
}

const checkScreenWidth = (): void => {
  isWideScreen.value = window.innerWidth > 768
}

watch(searchTerm, updateUrl)

document.title = 'Search Results - DeckuDB'

// Get search term from URL query parameter
searchTerm.value = normalizeQueryValue(route.query.q)

// Check screen width and set up listener
checkScreenWidth()
window.addEventListener('resize', checkScreenWidth)

// Perform initial search if there's a search term
void onSearch(searchTerm.value)

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkScreenWidth)
})
</script>

<style scoped>
.search-results-page {
  width: 100%;
}

.results-section {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--secondary-text-color);
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}

.empty-state p {
  font-size: 1.2rem;
  margin: 0 0 10px 0;
}

.empty-hint {
  font-size: 1rem !important;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .results-section {
    padding: 16px;
  }
}
</style>
