import { reactive } from 'vue'

export function useSwipe(options = {}) {
  // Default options
  const defaultOptions = {
    swipeThreshold: 50,
    velocityThreshold: 0.3,
    maxDragDistance: 0.25, // percentage of window width
    edgeResistance: 0.2,
    animationDuration: 300,
    ...options,
  }

  // Reactive state
  const swipeState = reactive({
    startX: 0,
    startY: 0,
    currentY: 0,
    currentX: 0,
    translateX: 0,
    isTransitioning: false,
    isDragging: false,
    isPointerDown: false,
    startTime: 0,
  })

  // Reset all swipe state
  const resetSwipeState = () => {
    swipeState.isTransitioning = false
    swipeState.isDragging = false
    swipeState.isPointerDown = false
    swipeState.startX = 0
    swipeState.startY = 0
    swipeState.currentY = 0
    swipeState.currentX = 0
    swipeState.translateX = 0
    swipeState.startTime = 0
  }

  // Start pointer event (common for touch and mouse)
  const startPointerEvent = (clientX, clientY) => {
    swipeState.startX = clientX
    swipeState.startY = clientY
    swipeState.currentY = clientY
    swipeState.currentX = clientX
    swipeState.startTime = Date.now()
    swipeState.isDragging = false
    swipeState.isTransitioning = false
  }

  // Move pointer event (common for touch and mouse)
  const movePointerEvent = (clientX, currentIndex, totalItems) => {
    swipeState.currentX = clientX
    const deltaX = swipeState.currentX - swipeState.startX
    const deltaY = Math.abs(swipeState.currentY - swipeState.startY)

    // Only start dragging if horizontal movement is greater than vertical
    if (!swipeState.isDragging && Math.abs(deltaX) > 15 && Math.abs(deltaX) > deltaY * 1.5) {
      swipeState.isDragging = true
    }

    if (swipeState.isDragging) {
      // Limit drag distance with resistance at edges
      const maxDrag = window.innerWidth * defaultOptions.maxDragDistance
      let limitedDelta = deltaX

      // Add resistance at edges
      if ((deltaX > 0 && currentIndex === 0) || (deltaX < 0 && currentIndex === totalItems - 1)) {
        limitedDelta = deltaX * defaultOptions.edgeResistance
      }

      swipeState.translateX = Math.max(-maxDrag, Math.min(maxDrag, limitedDelta))
    }
  }

  // End pointer event and determine swipe result
  const endPointerEvent = (currentIndex, totalItems) => {
    if (!swipeState.isDragging) {
      resetSwipeState()
      return null
    }

    const deltaX = swipeState.currentX - swipeState.startX
    const deltaTime = Date.now() - swipeState.startTime
    const velocity = Math.abs(deltaX) / deltaTime

    // Determine if swipe should trigger change
    const shouldSwipe =
      Math.abs(deltaX) > defaultOptions.swipeThreshold ||
      velocity > defaultOptions.velocityThreshold

    if (shouldSwipe) {
      let newIndex = currentIndex

      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous item
        newIndex = currentIndex - 1
      } else if (deltaX < 0 && currentIndex < totalItems - 1) {
        // Swipe left - go to next item
        newIndex = currentIndex + 1
      }

      if (newIndex !== currentIndex) {
        return {
          type: 'change',
          newIndex,
          direction: newIndex > currentIndex ? 'next' : 'prev',
        }
      }
    }

    return { type: 'reset' }
  }

  // Animate to new position
  const animateToPosition = (callback) => {
    swipeState.isTransitioning = true

    if (callback) {
      callback()
    }

    setTimeout(() => {
      resetSwipeState()
    }, defaultOptions.animationDuration)
  }

  // Reset position without changing active item
  const resetPosition = () => {
    swipeState.isTransitioning = true
    swipeState.translateX = 0

    setTimeout(() => {
      // resetSwipeState()
    }, defaultOptions.animationDuration)
  }

  // Touch event handlers
  const handleTouchStart = (e) => {
    startPointerEvent(e.touches[0].clientX, e.touches[0].clientY)
  }

  const handleTouchMove = (e, currentIndex, totalItems) => {
    if (!swipeState.isDragging && !swipeState.isTransitioning) {
      e.preventDefault()
    }
    movePointerEvent(e.touches[0].clientX, currentIndex, totalItems)
  }

  const handleTouchEnd = (currentIndex, totalItems) => {
    return endPointerEvent(currentIndex, totalItems)
  }

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = (e) => {
    swipeState.isPointerDown = true
    startPointerEvent(e.clientX, e.clientY)
  }

  const handleMouseMove = (e, currentIndex, totalItems) => {
    if (!swipeState.isPointerDown) return
    e.preventDefault()
    movePointerEvent(e.clientX, currentIndex, totalItems)
  }

  const handleMouseEnd = (currentIndex, totalItems) => {
    if (!swipeState.isPointerDown) return
    return endPointerEvent(currentIndex, totalItems)
  }

  return {
    // State
    swipeState,

    // Methods
    resetSwipeState,
    animateToPosition,
    resetPosition,

    // Touch handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Mouse handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseEnd,
  }
}
