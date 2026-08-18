<template>
    <section aria-label="Popular Games" class="popular-games-section">
        <h2 class="section-title">Popular Games</h2>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-container">
            <LoadingDots message="Loading popular games..." :size="10" />
        </div>

        <!-- Error State -->
        <div v-else-if="popularGames.length === 0" class="error-container">
            <p>Failed to load popular games.</p>
            <button @click="fetchPopularGames" class="retry-button">Retry</button>
        </div>

        <!-- Games Carousel (Desktop only) -->
        <div v-else-if="popularGames.length > 0 && !isMobile">
            <Carousel 
                :items="popularGames" 
                :items-per-slide="carouselItemsPerSlide"
                :is-loading-more="isLoadingMore"
                local-storage-key="popularGames_currentIndex"
                prev-aria-label="Previous games"
                next-aria-label="Next games"
                @last-item-visible="loadMoreGames"
            >
                <template #item="{ item: game }">
                    <PopularGameCard :game="asPopularGame(game)" @click="onGameClick" />
                </template>

                <template #loading-more>
                    <LoadingDots message="Loading more games..." :size="8" />
                </template>
            </Carousel>
        </div>

        <!-- Infinite Scroll (Mobile only) -->
        <div v-else-if="popularGames.length > 0 && isMobile">
            <InfiniteScrollCollection
                :items="popularGames"
                :is-loading-more="isLoadingMore"
                @last-item-visible="handleLastItemVisible"
            >
                <template #item="{ item: game }">
                    <PopularGameCard :game="asPopularGame(game)" @click="onGameClick" />
                </template>

                <template #loading-more>
                    <LoadingDots message="Loading more games..." :size="8" />
                </template>
            </InfiniteScrollCollection>
            <div v-if="!infiniteScrollActive" class="load-more-button-container">
              <Button 
                :disabled="isLoadingMore || !hasMoreGames"
                @click="activateInfiniteScroll"
              >
                Load More
              </Button>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useNuxtApp } from '#imports'
import Button from '../base/Button.vue'
import LoadingDots from '../base/LoadingDots.vue'
import Carousel from '../common/Carousel.vue'
import InfiniteScrollCollection from '../common/InfiniteScrollCollection.vue'
import PopularGameCard from './PopularGameCard.vue'
import type { PopularGame, PopularGamesResponse } from './types'

defineOptions({ name: 'PopularGames' })

const emit = defineEmits<{
  'game-selected': [game: PopularGame]
}>()

const { $backendApi } = useNuxtApp()

const carouselItemsPerSlide = ref(3)
const popularGames = ref<PopularGame[]>([])
const isLoading = ref(true)
const currentPage = ref(1)
const pageSize = 17
const hasMoreGames = ref(true)
const isLoadingMore = ref(false)
const isMobile = ref(false)
const infiniteScrollActive = ref(false)

const asPopularGame = (game: unknown): PopularGame => game as PopularGame

const fetchPopularGames = async (): Promise<void> => {
  isLoading.value = true
  try {
    const { items: games, total } = (await $backendApi.fetchMostPlayedGames(
      currentPage.value,
      pageSize
    )) as PopularGamesResponse
    popularGames.value = games || []
    hasMoreGames.value = total >= currentPage.value * pageSize
  } catch (error) {
    console.error('Error fetching popular games:', error)
    popularGames.value = []
    hasMoreGames.value = false
  } finally {
    isLoading.value = false
  }
}

const loadMoreGames = async (): Promise<void> => {
  if (isLoadingMore.value || !hasMoreGames.value) {
    return
  }

  isLoadingMore.value = true
  currentPage.value++

  try {
    const { items: games, total } = (await $backendApi.fetchMostPlayedGames(
      currentPage.value,
      pageSize
    )) as PopularGamesResponse

    if (games && games.length > 0) {
      popularGames.value = [...popularGames.value, ...games]
      hasMoreGames.value = total >= currentPage.value * pageSize
    } else {
      hasMoreGames.value = false
    }
  } catch (error) {
    console.error('Error loading more games:', error)
    hasMoreGames.value = false
  } finally {
    isLoadingMore.value = false
  }
}

const updateCarouselConf = (): void => {
  carouselItemsPerSlide.value = window.innerWidth < 1024 ? 2 : 3
}

const onResize = (): void => {
  isMobile.value = window.innerWidth < 640
  updateCarouselConf()
}

const onGameClick = (game: PopularGame): void => {
  emit('game-selected', game)
}

const activateInfiniteScroll = (): void => {
  infiniteScrollActive.value = true
  void loadMoreGames()
}

const handleLastItemVisible = (): void => {
  if (infiniteScrollActive.value) {
    void loadMoreGames()
  }
}

onMounted(async () => {
  isMobile.value = window.innerWidth < 640
  updateCarouselConf()
  await fetchPopularGames()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.popular-games-section {
    width: 100%;
    max-width: 900px;
    margin: 40px auto;
    padding: 0 20px;
}

.section-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 30px;
    text-align: center;
}

.loading-container,
.error-container {
    text-align: center;
    padding: 40px 20px;
}

.error-container p {
    color: var(--text-secondary);
    font-size: 1rem;
    margin-bottom: 16px;
}

.retry-button {
    background: var(--primary-color);
    color: var(--bg-card);
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.retry-button:hover {
    background: var(--primary-color-end);
    transform: translateY(-2px);
}

.load-more-button-container {
    text-align: center;
    margin-top: 20px;
}

/* Responsive Design */
@media (max-width: 1024px) {
    .popular-games-section {
        max-width: 700px;
    }
}

@media (max-width: 640px) {
    .section-title {
        font-size: 1.5rem;
    }

    .popular-games-section {
        max-width: 350px;
        padding: 0;
    }
}
</style>
