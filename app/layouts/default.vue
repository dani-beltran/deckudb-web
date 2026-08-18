<template>
  <div class="app-layout">
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <ScrollToTopButton />
    <DarkModeToggle />
    <div class="container">
      <main class="main-content" id="main-content">
        <slot />
      </main>
    </div>
    <!-- Footer Section -->
    <Footer />
  </div>
</template>

<script>
import DarkModeToggle from '../components/common/DarkModeToggle.vue'
import ScrollToTopButton from '../components/common/ScrollToTopButton.vue'
import Footer from '../components/ui/Footer.vue'
import { useDarkMode } from '../composables/useDarkMode'

export default {
  name: 'DefaultLayout',
  components: {
    Footer,
    ScrollToTopButton,
    DarkModeToggle,
  },
  setup() {
    // Initialize dark mode
    useDarkMode()
  },
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}

.app-layout::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: -175px;
  background-image: url('../assets/steamdeck_bg_vector.png');
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 92%;
  opacity: 0.1;
  pointer-events: none;
  z-index: -1;
}

.dark-mode .app-layout::before {
  filter: invert(100%);
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--primary-color);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  z-index: 1000;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 6px;
}

.container {
  flex: 1;
  max-width: 1200px;
  width: calc(100% - 40px);
  margin: 0 auto;
  padding: 20px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

@media (max-width: 1200px) {
  .app-layout::before {
    bottom: -60px;
  }
}

@media (max-width: 1200px) and (orientation: landscape) {
  .app-layout::before {
    position: absolute;
  }
}

@media (max-width: 768px) {
  .main-content {
    gap: 20px;
  }
}

@media (max-width: 576px) {
  .container {
    padding: 16px;
    width: calc(100% - 32px);
  }
  .app-layout::before {
    opacity: 0;
  }
}
</style>
