<template>
  <button
    @click="toggleDarkMode"
    class="dark-mode-toggle"
    :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <svg v-if="isDarkMode" class="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
    <svg v-else class="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  </button>
</template>

<script>
import { useDarkMode } from '@/composables/useDarkMode'

export default {
  name: 'DarkModeToggle',
  setup() {
    const { isDarkMode, toggleDarkMode } = useDarkMode()

    return {
      isDarkMode,
      toggleDarkMode,
    }
  },
}
</script>

<style scoped>
.dark-mode-toggle {
  position: fixed;
  bottom: 64px;
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

.dark-mode-toggle:hover {
  transform: scale(1.1);
  border-color: var(--highlight-color);
  box-shadow: 0 4px 16px var(--highlight-box-shadow-hover);
}

.dark-mode-toggle:active {
  transform: scale(0.95);
}

.icon {
  color: var(--secondary-text-color);
  transition: transform 0.3s ease;
}

.dark-mode-toggle:hover .icon {
  transform: rotate(15deg);
}
</style>
