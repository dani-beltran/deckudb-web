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
                    <PopularGameCard :game="game" @click="onGameClick(game)" />
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
                @last-item-visible="infiniteScrollActive ? loadMoreGames() : null"  
            >
                <template #item="{ item: game }">
                    <PopularGameCard :game="game" @click="onGameClick(game)" />
                </template>

                <template #loading-more>
                    <LoadingDots message="Loading more games..." :size="8" />
                </template>
            </InfiniteScrollCollection>
            <div v-if="!infiniteScrollActive" class="load-more-button-container">
              <Button 
                :disabled="isLoadingMore || !hasMoreGames"
                @click="() => {
                  this.infiniteScrollActive = true;
                  this.loadMoreGames();
                  }" 
              >
                Load More
              </Button>
            </div>
        </div>
    </section>
</template>

<script>
import apiService from '../../services/backend/apiService.js'
import Button from '../base/Button.vue'
import LoadingDots from '../base/LoadingDots.vue'
import Carousel from '../common/Carousel.vue'
import InfiniteScrollCollection from '../common/InfiniteScrollCollection.vue'
import PopularGameCard from './PopularGameCard.vue'

export default {
  name: 'PopularGames',
  components: {
    LoadingDots,
    Carousel,
    InfiniteScrollCollection,
    PopularGameCard,
    Button,
  },
  emits: ['game-selected'],
  data() {
    return {
      carouselItemsPerSlide: 3,
      popularGames: [],
      isLoading: true,
      error: null,
      currentPage: 1,
      pageSize: 17,
      hasMoreGames: true,
      isLoadingMore: false,
      isMobile: false,
      infiniteScrollActive: false,
    }
  },
  async mounted() {
    this.isMobile = window.innerWidth < 640
    this.updateCarouselConf()
    await this.fetchPopularGames()
    window.addEventListener('resize', this.onResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize)
  },
  methods: {
    async fetchPopularGames() {
      this.isLoading = true
      this.error = null
      try {
        const { items: games, total } = await apiService.fetchMostPlayedGames(
          this.currentPage,
          this.pageSize
        )
        this.popularGames = games || []
        this.hasMoreGames = total >= this.currentPage * this.pageSize
      } catch (err) {
        console.error('Error fetching popular games:', err)
        this.popularGames = []
        this.hasMoreGames = false
      } finally {
        this.isLoading = false
      }
    },
    async loadMoreGames() {
      if (this.isLoadingMore || !this.hasMoreGames) {
        return
      }

      this.isLoadingMore = true
      this.currentPage++

      try {
        const { items: games, total } = await apiService.fetchMostPlayedGames(
          this.currentPage,
          this.pageSize
        )

        if (games && games.length > 0) {
          this.popularGames = [...this.popularGames, ...games]
          this.hasMoreGames = total >= this.currentPage * this.pageSize
        } else {
          this.hasMoreGames = false
        }
      } catch (err) {
        console.error('Error loading more games:', err)
        this.hasMoreGames = false
      } finally {
        this.isLoadingMore = false
      }
    },
    updateCarouselConf() {
      const width = window.innerWidth
      this.windowWidth = width
      if (width < 1024) {
        this.carouselItemsPerSlide = 2
      } else {
        this.carouselItemsPerSlide = 3
      }
    },
    onResize() {
      this.isMobile = window.innerWidth < 640
      this.updateCarouselConf()
    },
    onGameClick(game) {
      this.$emit('game-selected', game)
    },
  },
}
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
