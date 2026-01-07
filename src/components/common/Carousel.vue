<template>
    <div class="carousel-section">
        <!-- Carousel Container -->
        <div v-if="items.length > 0" class="carousel-container">
            <button class="carousel-button prev" @click="previousSlide" :disabled="currentIndex === 0"
                :aria-label="prevAriaLabel">
                ‹
            </button>

            <div class="carousel-track-wrapper">
                <div class="carousel-track" :style="trackStyle">
                    <div v-for="(item, index) in displayedItems" :key="index" class="carousel-item" :style="itemStyle">
                        <slot name="item" :item="item" :index="index"></slot>
                    </div>
                    <!-- Loading More Indicator -->
                    <div v-if="isLoadingMore" class="carousel-item loading-more-container">
                        <slot name="loading-more"></slot>
                    </div>
                </div>
            </div>

            <button class="carousel-button next" @click="nextSlide" :disabled="currentIndex >= maxIndex"
                :aria-label="nextAriaLabel">
                ›
            </button>
        </div>

        <!-- Carousel Indicators -->
        <div v-if="items.length > 0" class="carousel-indicators">
            <button v-for="(dot, index) in totalSlides" :key="index" class="indicator-dot"
                :class="{ active: index === currentIndex }" @click="goToSlide(index)"
                :aria-label="`Go to slide ${index + 1}`"></button>
        </div>
    </div>
</template>

<script>
export default {
  name: 'Carousel',
  props: {
    items: {
      type: Array,
      required: true,
    },
    itemsPerSlide: {
      type: Number,
      default: 3,
    },
    isLoadingMore: {
      type: Boolean,
      default: false,
    },
    localStorageKey: {
      type: String,
      default: 'carousel_currentIndex',
    },
    prevAriaLabel: {
      type: String,
      default: 'Previous items',
    },
    nextAriaLabel: {
      type: String,
      default: 'Next items',
    },
  },
  emits: ['index-changed', 'last-item-visible'],
  data() {
    return {
      currentIndex: 0,
      intersectionObserver: null,
    }
  },
  computed: {
    displayedItems() {
      return this.items
    },
    totalSlides() {
      return Math.ceil(this.items.length / this.itemsPerSlide)
    },
    maxIndex() {
      return this.totalSlides - 1
    },
    itemStyle() {
      return {
        flex: `0 0 ${100 / this.itemsPerSlide}%`,
      }
    },
    trackStyle() {
      const translateX = -(this.currentIndex * 100)

      return {
        transform: `translateX(${translateX}%)`,
        transition: 'transform 0.3s ease-in-out',
      }
    },
  },
  watch: {
    currentIndex(newIndex) {
      this.saveCurrentIndex(newIndex)
      this.$emit('index-changed', newIndex)
    },
    items: {
      handler() {
        // Re-observe when items change
        this.$nextTick(() => {
          this.observeLastItem()
        })
      },
      deep: true,
    },
  },
  async mounted() {
    this.restoreCurrentIndex()
    this.setupIntersectionObserver()
  },
  beforeUnmount() {
    this.disconnectIntersectionObserver()
  },
  methods: {
    nextSlide() {
      if (this.currentIndex < this.maxIndex) {
        this.currentIndex++
      }
    },
    previousSlide() {
      if (this.currentIndex > 0) {
        this.currentIndex--
      }
    },
    goToSlide(index) {
      this.currentIndex = index
    },
    saveCurrentIndex(index) {
      try {
        localStorage.setItem(this.localStorageKey, index.toString())
      } catch (err) {
        console.warn('Failed to save current index to localStorage:', err)
      }
    },
    restoreCurrentIndex() {
      try {
        const savedIndex = localStorage.getItem(this.localStorageKey)
        if (savedIndex !== null) {
          const index = parseInt(savedIndex, 10)
          if (!Number.isNaN(index) && index >= 0 && index <= this.maxIndex) {
            this.currentIndex = index
          }
        }
      } catch (err) {
        console.warn('Failed to restore current index from localStorage:', err)
      }
    },
    setupIntersectionObserver() {
      this.disconnectIntersectionObserver()
      
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const lastItem = entries[0]
          if (lastItem.isIntersecting && !this.isLoadingMore) {
            this.$emit('last-item-visible')
          }
        },
        {
          root: null,
          rootMargin: '100px',
          threshold: 0.1,
        }
      )
      
      this.$nextTick(() => {
        this.observeLastItem()
      })
    },
    observeLastItem() {
      if (!this.intersectionObserver) {
        return
      }
      
      // Disconnect all previous observations
      this.intersectionObserver.disconnect()
      
      const items = this.$el.querySelectorAll('.carousel-item')
      if (items.length > 0) {
        const lastItem = items[items.length - 1]
        this.intersectionObserver.observe(lastItem)
      }
    },
    disconnectIntersectionObserver() {
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect()
        this.intersectionObserver = null
      }
    },
  },
}
</script>

<style scoped>
.carousel-section {
    width: 100%;
}

.carousel-container {
    position: relative;
    display: flex;
    align-items: center;
    gap: 15px;
}

.carousel-button {
    background: var(--bg-card);
    border: 2px solid var(--secondary-border-color);
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--secondary-text-color);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    z-index: 10;
}

.carousel-button:hover:not(:disabled) {
    background: var(--primary-color);
    color: var(--bg-card);
    border-color: var(--primary-color);
    transform: scale(1.1);
}

.carousel-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.carousel-track-wrapper {
    flex: 1;
    overflow: hidden;
    padding-top: 8px;
}

.carousel-track {
    display: flex;
    width: 100%;
}

.carousel-item {
    padding: 0 10px;
    box-sizing: border-box;
    min-width: 0;
}

.carousel-indicators {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 20px;
}

.indicator-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #d1d5db;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
}

.indicator-dot:hover {
    background: var(--text-tertiary);
}

.indicator-dot.active {
    background: var(--primary-color);
    width: 30px;
    border-radius: 5px;
}

.loading-more-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
    padding: 20px;
}
</style>
