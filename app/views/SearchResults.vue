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

<script lang="ts">
import { defineComponent } from 'vue'
import Spinner from '../components/base/Spinner.vue'
import GameSearchResults from '../components/ui/GameSearchResults.vue'
import NavigationHeader from '../components/ui/NavigationHeader.vue'
import type { SearchGame, SearchGamesResponse } from '../components/ui/types'

interface SearchError {
  title: string
  message: string
}

interface SearchResultsState {
  searchResults: SearchGame[]
  searchLoading: boolean
  searchError: SearchError | null
  searchTerm: string
  isWideScreen: boolean
}

function normalizeQueryValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''

  const firstValue = value[0]
  return typeof firstValue === 'string' ? firstValue : ''
}

export default defineComponent({
  name: 'SearchResults',
  components: {
    NavigationHeader,
    GameSearchResults,
    Spinner,
  },
  data(): SearchResultsState {
    return {
      searchResults: [],
      searchLoading: false,
      searchError: null,
      searchTerm: '',
      isWideScreen: false,
    }
  },
  computed: {
    initialResultsCount(): number {
      return this.isWideScreen ? 8 : 4
    },
  },
  created() {
    document.title = 'Search Results - DeckuDB'

    // Get search term from URL query parameter
    this.searchTerm = normalizeQueryValue(this.$route.query.q)

    // Check screen width and set up listener
    this.checkScreenWidth()
    window.addEventListener('resize', this.checkScreenWidth)

    // Perform initial search if there's a search term
    this.onSearch(this.searchTerm)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkScreenWidth)
  },
  watch: {
    searchTerm() {
      this.updateUrl()
    },
  },
  methods: {
    async onSearch(term?: string) {
      if (!term?.trim()) {
        this.searchError = {
          title: 'No search term entered',
          message: 'Please enter a game name into the search bar.',
        }
        return
      }

      this.searchLoading = true
      this.searchError = null
      this.searchResults = []

      try {
        const results = (await this.$backendApi.searchSteamGamesByName(
          term.trim()
        )) as SearchGamesResponse
        this.searchResults = results.items || []
        if (this.searchResults.length === 0) {
          this.searchError = {
            title: 'No games found with that name',
            message: 'Try a different search term or check the spelling.',
          }
        }
      } catch (err) {
        console.error('Error searching for games:', err)
        this.searchError = {
          title: 'Error searching for games',
          message: 'An error occurred while searching. Please try again later.',
        }
      } finally {
        this.searchLoading = false
      }
    },
    onGameSelected(game: SearchGame) {
      this.$router.push({
        name: 'Game',
        params: { gameId: game.steam_appid ?? game.id },
      })
    },
    updateUrl() {
      const currentQuery = normalizeQueryValue(this.$route.query.q)
      if (this.searchTerm !== currentQuery) {
        this.$router.replace({
          name: 'SearchResults',
          query: this.searchTerm?.trim() ? { q: this.searchTerm.trim() } : {},
        })
      }
    },
    checkScreenWidth() {
      this.isWideScreen = window.innerWidth > 768
    },
  },
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
