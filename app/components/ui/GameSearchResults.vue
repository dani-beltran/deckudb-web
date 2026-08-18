<template>
  <div v-if="results.length > 0" class="game-results" role="region" aria-label="Search results">
    <h3>Found {{ results.length }} Steam games:</h3>
    <div class="game-grid" role="list" aria-label="List of Steam games with available settings">
      <transition-group name="game-card" tag="div" class="game-grid-inner">
        <GameCard
          v-for="(game, index) in displayedResults" 
          :key="game.id"
          :game="game"
          :is-selected="selectedGameId === game.id"
          :animation-delay="index >= initialResultsCount ? (index - initialResultsCount) * 0.1 : 0"
          @select="selectGameCard"
          role="listitem"
        />
      </transition-group>
    </div>
    
    <!-- Show More Button -->
    <transition name="show-more">
      <div v-if="hasMoreResults" class="show-more-container">
        <Button 
          @click="handleShowMore" 
          variant="primary" 
          size="medium"
        >
          Show more results ({{ results.length - initialResultsCount }})
        </Button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNuxtApp } from '#imports'
import recentGamesStore from '../../stores/recentGamesStore'
import Button from '../base/Button.vue'
import GameCard from './GameCard.vue'
import type { GameId, SearchGame } from './types'

defineOptions({ name: 'GameSearchResults' })

const props = withDefaults(
  defineProps<{
    results?: SearchGame[]
    selectedGameId?: GameId | null
    searchTerm?: string
    initialResultsCount?: number
  }>(),
  {
    results: () => [],
    selectedGameId: null,
    searchTerm: '',
    initialResultsCount: 4,
  }
)

const emit = defineEmits<{
  'game-selected': [game: SearchGame]
}>()

const { $analytics } = useNuxtApp()
const showAllResults = ref(false)

const displayedResults = computed<SearchGame[]>(() => {
  if (showAllResults.value || props.results.length <= props.initialResultsCount) {
    return props.results
  }
  return props.results.slice(0, props.initialResultsCount)
})

const hasMoreResults = computed(
  () => props.results.length > props.initialResultsCount && !showAllResults.value
)

watch(
  () => props.results,
  () => {
    // Reset show all when results change
    showAllResults.value = false
  }
)

const selectGameCard = (game: SearchGame): void => {
  recentGamesStore.saveRecentSearchedGameId(game.id)
  $analytics.trackGameSelect(game, 'search_result')
  emit('game-selected', game)
}

const handleShowMore = (): void => {
  $analytics.trackShowMoreResults(props.searchTerm, props.results.length, props.initialResultsCount)
  showAllResults.value = true
}
</script>

<style scoped>
/* Game Search Results Styles */
.game-results {
  margin-top: 30px;
  width: 100%;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.game-results h3 {
  color: var(--secondary-text-color);
  margin-bottom: 20px;
  font-size: 1.2rem;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.game-grid-inner {
  display: contents;
}

/* Animation styles for game cards */
.game-card-enter-active {
  transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-delay: var(--animation-delay, 0s);
}

.game-card-enter-from {
  opacity: 0;
  transform: translateY(40px) scale(0.9);
}

.game-card-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.game-card-leave-active {
  transition: all 0.3s ease;
}

.game-card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.show-more-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* Show More button transition animations */
.show-more-enter-active {
  transition: all 0.4s ease;
}

.show-more-leave-active {
  transition: all 0.3s ease;
}

.show-more-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}

.show-more-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

@media (max-width: 768px) {
  .game-grid {
    grid-template-columns: 1fr;
  }
}
</style>
