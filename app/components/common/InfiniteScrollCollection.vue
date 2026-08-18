<template>
    <div ref="collectionElement" class="infinite-scroll-collection">
        <div class="items-list">
            <div v-for="(item, index) in items" :key="index" class="list-item">
                <slot name="item" :item="item" :index="index"></slot>
            </div>
            
            <!-- Loading More Indicator -->
            <div v-if="isLoadingMore" class="loading-more-indicator">
                <slot name="loading-more"></slot>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

defineOptions({ name: 'InfiniteScrollCollection' })

const props = withDefaults(
  defineProps<{
    items: unknown[]
    isLoadingMore?: boolean
  }>(),
  {
    isLoadingMore: false,
  }
)

const emit = defineEmits<{
  'last-item-visible': []
}>()

const collectionElement = ref<HTMLElement | null>(null)
let intersectionObserver: IntersectionObserver | null = null

const observeLastItem = (): void => {
  if (!intersectionObserver) {
    return
  }

  // Disconnect all previous observations
  intersectionObserver.disconnect()

  const items = collectionElement.value?.querySelectorAll('.list-item')
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

watch(
  () => props.items,
  () => {
    // Re-observe when items change
    void nextTick(observeLastItem)
  },
  { deep: true }
)

onMounted(setupIntersectionObserver)
onBeforeUnmount(disconnectIntersectionObserver)

defineExpose({
  setupIntersectionObserver,
  observeLastItem,
  disconnectIntersectionObserver,
})
</script>

<style scoped>
.infinite-scroll-collection {
    width: 100%;
}

.items-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.list-item {
    width: 100%;
}

.loading-more-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    margin-top: 20px;
}
</style>
