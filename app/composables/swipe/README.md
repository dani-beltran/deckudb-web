# useSwipe Composable

A reusable Vue 3 composable for handling horizontal swipe gestures with smooth animations.

## Features

- **Touch & Mouse Support**: Works on both mobile devices (touch) and desktop (mouse drag)
- **Configurable Thresholds**: Customizable swipe distance and velocity thresholds
- **Edge Resistance**: Provides visual feedback when swiping beyond available items
- **Smooth Animations**: Built-in animation support with customizable duration
- **State Management**: Reactive state management with automatic cleanup

## Basic Usage

```javascript
import { useSwipe } from '@/composables/useSwipe'

export default {
  setup() {
    const {
      swipeState,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleMouseDown,
      handleMouseMove,
      handleMouseEnd,
      resetSwipeState,
      animateToPosition,
      resetPosition
    } = useSwipe()

    // Handle swipe results
    const onTouchEnd = (e) => {
      const result = handleTouchEnd(currentIndex.value, totalItems.value)
      if (result?.type === 'change') {
        // Handle item change
        changeToIndex(result.newIndex)
      } else if (result?.type === 'reset') {
        resetPosition()
      }
    }

    return {
      swipeState,
      onTouchEnd,
      // ... other handlers
    }
  }
}
```

## Template Usage

```vue
<template>
  <div 
    class="swipeable-container"
    @touchstart="handleTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @mousedown="handleMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseEnd"
    @mouseleave="onMouseEnd"
  >
    <div 
      class="content-wrapper"
      :style="{ transform: `translateX(${swipeState.translateX}px)` }"
      :class="{ 'transitioning': swipeState.isTransitioning }"
    >
      <!-- Your swipeable content -->
    </div>
  </div>
</template>
```

## Configuration Options

```javascript
const swipe = useSwipe({
  swipeThreshold: 50,        // Minimum distance in pixels to trigger swipe
  velocityThreshold: 0.3,    // Minimum velocity to trigger swipe
  maxDragDistance: 0.25,     // Max drag distance as percentage of window width
  edgeResistance: 0.2,       // Resistance factor at edges (0-1)
  animationDuration: 300     // Animation duration in milliseconds
})
```

## Return Values

### State
- `swipeState`: Reactive object containing:
  - `translateX`: Current horizontal translation
  - `isDragging`: Whether user is currently dragging
  - `isTransitioning`: Whether animation is in progress
  - Other internal state properties

### Methods
- `resetSwipeState()`: Reset all state to initial values
- `animateToPosition(callback)`: Animate with custom callback
- `resetPosition()`: Animate back to original position

### Event Handlers
- Touch: `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`
- Mouse: `handleMouseDown`, `handleMouseMove`, `handleMouseEnd`

## Swipe Results

The `handleTouchEnd` and `handleMouseEnd` methods return result objects:

```javascript
// Item change
{
  type: 'change',
  newIndex: 2,
  direction: 'next' | 'prev'
}

// Reset to original position
{
  type: 'reset'
}

// No action needed
null
```

## CSS Requirements

Your CSS should include transition support:

```css
.content-wrapper {
  transition: none;
  will-change: transform;
}

.content-wrapper.transitioning {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Best Practices

1. **Always handle swipe results**: Check the return value of end handlers
2. **Provide current context**: Pass current index and total items to move/end handlers
3. **Use with touch-action**: Set `touch-action: pan-y` to allow vertical scrolling
4. **Reset on unmount**: The composable handles cleanup automatically

## Example: Tab Component

See `TabComponent.vue` for a complete implementation example using this composable.