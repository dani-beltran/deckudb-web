import { onMounted, ref, watch } from 'vue'

const isDarkMode = ref(false)

export function useDarkMode() {
  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
  }

  const setDarkMode = (value) => {
    isDarkMode.value = value
  }

  // Watch for changes and update the DOM and localStorage
  watch(isDarkMode, (newValue) => {
    if (newValue) {
      document.documentElement.classList.add('dark-mode')
      localStorage.setItem('darkMode', 'enabled')
    } else {
      document.documentElement.classList.remove('dark-mode')
      localStorage.setItem('darkMode', 'disabled')
    }
  })

  // Initialize dark mode from localStorage or system preference
  onMounted(() => {
    const savedMode = localStorage.getItem('darkMode')

    if (savedMode === 'enabled') {
      isDarkMode.value = true
    } else if (savedMode === 'disabled') {
      isDarkMode.value = false
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDarkMode.value = prefersDark
    }
  })

  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
  }
}
