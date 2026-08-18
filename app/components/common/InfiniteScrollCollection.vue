<template>
    <div class="infinite-scroll-collection">
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

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'InfiniteScrollCollection',
  props: {
    items: {
      type: Array as PropType<unknown[]>,
      required: true,
    },
    isLoadingMore: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    'last-item-visible': () => true,
  },
  data() {
    return {
      intersectionObserver: null as IntersectionObserver | null,
    }
  },
  mounted() {
    this.setupIntersectionObserver()
  },
  beforeUnmount() {
    this.disconnectIntersectionObserver()
  },
  methods: {
    setupIntersectionObserver() {
      this.disconnectIntersectionObserver()

      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const lastItem = entries[0]
          if (lastItem?.isIntersecting && !this.isLoadingMore) {
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

      const items = (this.$el as HTMLElement).querySelectorAll('.list-item')
      if (items.length > 0) {
        const lastItem = items[items.length - 1]
        if (lastItem) this.intersectionObserver.observe(lastItem)
      }
    },
    disconnectIntersectionObserver() {
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect()
        this.intersectionObserver = null
      }
    },
  },
  watch: {
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
