<template>
  <div class="home">
    <section aria-label="Deckudb Home" class="header-section">
      <HomeHeader />
    </section>

    <section aria-label="Game Search" class="search-section">
      <h2 class="search-title">Search by game</h2>
      <GameSearch 
        v-model="searchTerm"
        @search="onSearch"
        :loading="searching"
      />
    </section>

    <section aria-label="Popular Games" class="popular-section">
      <PopularGames @game-selected="onGameSelected" />
    </section>
  </div>
</template>

<script>
import GameSearch from '../components/ui/GameSearch.vue'
import GameSearchResults from '../components/ui/GameSearchResults.vue'
import HomeHeader from '../components/ui/HomeHeader.vue'
import PopularGames from '../components/ui/PopularGames.vue'

export default {
  name: 'Home',
  components: {
    GameSearch,
    GameSearchResults,
    HomeHeader,
    PopularGames,
  },
  data() {
    return {
      searchTerm: '',
      searching: false,
    }
  },
  created() {
    // Set document title for home page
    document.title = 'DeckuDB - Optimize Your Games for Steam Deck'
  },
  methods: {
    onSearch() {
      if (!this.searchTerm) return
      this.searching = true
      // redirect to search results page with delay
      setTimeout(() => {
        this.searching = false
        this.$router.push({ name: 'SearchResults', query: { q: this.searchTerm } })
      }, 300)
    },
    onGameSelected(game) {
      // Navigate to the game page
      this.$router.push({
        name: 'Game',
        params: { gameId: game.steam_appid ?? game.id },
        query: this.searchTerm ? { q: this.searchTerm } : {},
      })
    },
  },
}
</script>

<style scoped>
.home {
  width: 100%;
}

.popular-section {
  margin-bottom: 20px;
  max-width: 100%;
}

.search-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 100px;
}

.search-title {
  color: var(--secondary-text-color);
  margin-bottom: 20px;
  font-size: 1.5rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .search-title {
    font-size: 1.3rem;
  }

  .search-section {
    margin-bottom: 60px;
  }
}
</style>