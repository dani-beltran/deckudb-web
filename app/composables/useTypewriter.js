import { onBeforeUnmount, ref, watch } from 'vue'

/**
 * Composable for creating a typewriter animation effect
 * @param {Object} options - Configuration options
 * @param {import('vue').Ref<string>} options.text - Reactive text content to animate
 * @param {number} options.typeSpeed - Milliseconds per character (default: 50)
 * @param {number} options.startDelay - Delay before starting animation (default: 500)
 * @returns {Object} - Typewriter state and controls
 */
export function useTypewriter(options = {}) {
  const { text = ref(''), typeSpeed = 50, startDelay = 500 } = options

  const displayedText = ref('')
  const currentIndex = ref(0)
  const isTyping = ref(false)
  const isComplete = ref(false)

  let typewriterInterval = null
  let startTimeout = null

  /**
   * Clear all active intervals and timeouts
   */
  const clearTimers = () => {
    if (typewriterInterval) {
      clearInterval(typewriterInterval)
      typewriterInterval = null
    }
    if (startTimeout) {
      clearTimeout(startTimeout)
      startTimeout = null
    }
  }

  /**
   * Reset the typewriter state
   */
  const reset = () => {
    clearTimers()
    displayedText.value = ''
    currentIndex.value = 0
    isTyping.value = false
    isComplete.value = false
  }

  /**
   * Start the typewriter animation
   */
  const start = () => {
    reset()

    const textValue = typeof text.value === 'string' ? text.value : text

    if (!textValue || textValue.length === 0) {
      isComplete.value = true
      return
    }

    isTyping.value = true

    // Start typewriter after delay
    startTimeout = setTimeout(() => {
      typewriterInterval = setInterval(() => {
        if (currentIndex.value < textValue.length) {
          displayedText.value += textValue[currentIndex.value]
          currentIndex.value++
        } else {
          // Animation complete
          clearTimers()
          isTyping.value = false
          isComplete.value = true
        }
      }, typeSpeed)
    }, startDelay)
  }

  /**
   * Skip the animation and show full text immediately
   */
  const skip = () => {
    clearTimers()
    const textValue = typeof text.value === 'string' ? text.value : text
    displayedText.value = textValue
    currentIndex.value = textValue.length
    isTyping.value = false
    isComplete.value = true
  }

  /**
   * Pause the typewriter animation
   */
  const pause = () => {
    if (typewriterInterval) {
      clearInterval(typewriterInterval)
      typewriterInterval = null
      isTyping.value = false
    }
  }

  /**
   * Resume the typewriter animation
   */
  const resume = () => {
    if (isComplete.value) return

    const textValue = typeof text.value === 'string' ? text.value : text

    if (currentIndex.value < textValue.length) {
      isTyping.value = true
      typewriterInterval = setInterval(() => {
        if (currentIndex.value < textValue.length) {
          displayedText.value += textValue[currentIndex.value]
          currentIndex.value++
        } else {
          clearTimers()
          isTyping.value = false
          isComplete.value = true
        }
      }, typeSpeed)
    }
  }

  // Watch for text changes and restart animation
  watch(text, () => {
    if (text.value) {
      start()
    } else {
      reset()
    }
  })

  // Cleanup on unmount
  onBeforeUnmount(() => {
    clearTimers()
  })

  return {
    displayedText,
    currentIndex,
    isTyping,
    isComplete,
    start,
    reset,
    skip,
    pause,
    resume,
  }
}
