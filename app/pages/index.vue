<template>
  <div class="home">
    <section aria-label="Deckudb Home" class="header-section">
      <HomeHeader />
    </section>

    <section aria-label="Game Search" class="search-section">
      <h2 class="search-title" data-testid="search-title">Search by game</h2>
      <GameSearch v-model="searchTerm" :loading="searching" @search="onSearch" />
    </section>

    <section aria-label="Popular Games" class="popular-section">
      <PopularGames @game-selected="onGameSelected" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, useHead, useRouter } from '#imports'
import GameSearch from '../components/ui/GameSearch.vue'
import HomeHeader from '../components/ui/HomeHeader.vue'
import PopularGames from '../components/ui/PopularGames.vue'
import type { PopularGame } from '../components/ui/types'

definePageMeta({ name: 'Home' })
useHead({ title: 'DeckuDB - Optimize Your Games for Steam Deck' })

const router = useRouter()
const searchTerm = ref('')
const searching = ref(false)

const onSearch = (): void => {
  if (!searchTerm.value) return
  searching.value = true
  // redirect to search results page with delay
  setTimeout(() => {
    searching.value = false
    void router.push({ name: 'SearchResults', query: { q: searchTerm.value } })
  }, 300)
}

const onGameSelected = (game: PopularGame): void => {
  // Navigate to the game page
  void router.push({
    name: 'Game',
    params: { gameId: game.steam_appid ?? game.id },
    query: searchTerm.value ? { q: searchTerm.value } : {},
  })
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
