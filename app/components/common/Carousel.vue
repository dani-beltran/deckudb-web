<template>
    <div ref="carouselSection" class="carousel-section">
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

<script setup lang="ts">
import { type CSSProperties, computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

defineOptions({ name: 'Carousel' })

const props = withDefaults(
  defineProps<{
    items: unknown[]
    itemsPerSlide?: number
    isLoadingMore?: boolean
    localStorageKey?: string
    prevAriaLabel?: string
    nextAriaLabel?: string
  }>(),
  {
    itemsPerSlide: 3,
    isLoadingMore: false,
    localStorageKey: 'carousel_currentIndex',
    prevAriaLabel: 'Previous items',
    nextAriaLabel: 'Next items',
  }
)

const emit = defineEmits<{
  'index-changed': [index: number]
  'last-item-visible': []
}>()

const carouselSection = ref<HTMLElement | null>(null)
const currentIndex = ref(0)
let intersectionObserver: IntersectionObserver | null = null

const displayedItems = computed(() => props.items)
const totalSlides = computed(() => Math.ceil(props.items.length / props.itemsPerSlide))
const maxIndex = computed(() => totalSlides.value - 1)
const itemStyle = computed<CSSProperties>(() => ({
  flex: `0 0 ${100 / props.itemsPerSlide}%`,
}))
const trackStyle = computed<CSSProperties>(() => ({
  transform: `translateX(${-currentIndex.value * 100}%)`,
  transition: 'transform 0.3s ease-in-out',
}))

const nextSlide = (): void => {
  if (currentIndex.value < maxIndex.value) {
    currentIndex.value++
  }
}

const previousSlide = (): void => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const goToSlide = (index: number): void => {
  currentIndex.value = index
}

const saveCurrentIndex = (index: number): void => {
  try {
    localStorage.setItem(props.localStorageKey, index.toString())
  } catch (err) {
    console.warn('Failed to save current index to localStorage:', err)
  }
}

const restoreCurrentIndex = (): void => {
  try {
    const savedIndex = localStorage.getItem(props.localStorageKey)
    if (savedIndex !== null) {
      const index = parseInt(savedIndex, 10)
      if (!Number.isNaN(index) && index >= 0 && index <= maxIndex.value) {
        currentIndex.value = index
      }
    }
  } catch (err) {
    console.warn('Failed to restore current index from localStorage:', err)
  }
}

const observeLastItem = (): void => {
  if (!intersectionObserver) {
    return
  }

  // Disconnect all previous observations
  intersectionObserver.disconnect()

  const items = carouselSection.value?.querySelectorAll('.carousel-item')
  const lastItem = items?.[items.length - 1]
  if (lastItem) intersectionObserver.observe(lastItem)
}

const disconnectIntersectionObserver = (): void => {
  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }
}

const setupIntersectionObserver = (): void => {
  disconnectIntersectionObserver()

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      const lastItem = entries[0]
      if (lastItem?.isIntersecting && !props.isLoadingMore) {
        emit('last-item-visible')
      }
    },
    {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    }
  )

  void nextTick(observeLastItem)
}

watch(currentIndex, (newIndex) => {
  saveCurrentIndex(newIndex)
  emit('index-changed', newIndex)
})

watch(
  () => props.items,
  () => {
    // Re-observe when items change
    void nextTick(observeLastItem)
  },
  { deep: true }
)

onMounted(() => {
  restoreCurrentIndex()
  setupIntersectionObserver()
})

onBeforeUnmount(disconnectIntersectionObserver)

defineExpose({
  nextSlide,
  previousSlide,
  goToSlide,
  saveCurrentIndex,
  restoreCurrentIndex,
  setupIntersectionObserver,
  observeLastItem,
  disconnectIntersectionObserver,
})
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
