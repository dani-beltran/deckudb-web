<template>
  <button
    v-if="isVisible"
    @click="scrollToTop"
    class="scroll-to-top"
    aria-label="Scroll to top"
    title="Scroll to top"
  >
    <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  </button>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'ScrollToTopButton',
  setup() {
    const isVisible = ref(false)
    let throttleTimeout = null

    const handleScroll = () => {
      // Throttle scroll event handler for better performance
      if (throttleTimeout) return

      throttleTimeout = setTimeout(() => {
        // Show button when scrolled down at least twice the screen height
        const scrollThreshold = window.innerHeight * 2
        isVisible.value = window.scrollY > scrollThreshold
        throttleTimeout = null
      }, 100)
    }

    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }

    onMounted(() => {
      window.addEventListener('scroll', handleScroll, { passive: true })
      // Check initial scroll position
      const scrollThreshold = window.innerHeight * 2
      isVisible.value = window.scrollY > scrollThreshold
    })

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll)
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }
    })

    return {
      isVisible,
      scrollToTop,
    }
  },
}
</script>

<style scoped>
.scroll-to-top {
  position: fixed;
  bottom: 120px;
  left: 10px;
  z-index: 1000;
  background: var(--secondary-color);
  border: 2px solid var(--secondary-border-color);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.scroll-to-top:hover {
  transform: scale(1.1);
  border-color: var(--highlight-color);
  box-shadow: 0 4px 16px var(--highlight-box-shadow-hover);
}

.scroll-to-top:active {
  transform: scale(0.95);
}

.icon {
  color: var(--secondary-text-color);
  transition: transform 0.3s ease;
}

.scroll-to-top:hover .icon {
  transform: translateY(-2px);
}
</style>
