<template>
  <Transition
    :name="transitionName"
    @before-enter="beforeEnter"
    @enter="enter"
    @leave="leave"
  >
    <div v-show="show" :class="['expand-content', contentClass]">
      <slot></slot>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

interface TransitionDuration {
  enter: number
  leave: number
}

defineOptions({ name: 'ExpandTransition' })

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  transitionName: {
    type: String,
    default: 'expand',
  },
  contentClass: {
    type: String,
    default: '',
  },
  duration: {
    type: Object as PropType<TransitionDuration>,
    default: () => ({
      enter: 400,
      leave: 300,
    }),
  },
  easing: {
    type: String,
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  translateDistance: {
    type: Number,
    default: 15,
  },
  scale: {
    type: Number,
    default: 0.95,
  },
})

const beforeEnter = (el: Element): void => {
  const element = el as HTMLElement
  element.style.height = '0'
  element.style.opacity = '0'
  element.style.transform = `translateY(-${props.translateDistance}px) scale(${props.scale})`
  element.style.paddingTop = '0'
  element.style.paddingBottom = '0'
}

const enter = (el: Element): void => {
  const element = el as HTMLElement
  element.offsetHeight // force reflow
  const targetHeight = element.scrollHeight
  element.style.transition = `height ${props.duration.enter}ms ${props.easing}, opacity ${Math.floor(props.duration.enter * 0.75)}ms ease-out ${Math.floor(props.duration.enter * 0.25)}ms, transform ${props.duration.enter}ms ${props.easing} ${Math.floor(props.duration.enter * 0.125)}ms, padding ${props.duration.enter}ms ${props.easing}`
  element.style.height = `${targetHeight}px`
  element.style.opacity = '1'
  element.style.transform = 'translateY(0) scale(1)'
  element.style.paddingTop = ''
  element.style.paddingBottom = ''

  // Clean up after animation
  setTimeout(() => {
    element.style.height = 'auto'
  }, props.duration.enter)
}

const leave = (el: Element): void => {
  const element = el as HTMLElement
  const currentHeight = element.offsetHeight
  element.style.height = `${currentHeight}px`
  element.offsetHeight // force reflow
  element.style.transition = `height ${props.duration.leave}ms ${props.easing} ${Math.floor(props.duration.leave * 0.167)}ms, opacity ${Math.floor(props.duration.leave * 0.667)}ms ease-in, transform ${props.duration.leave}ms ${props.easing}, padding ${props.duration.leave}ms ${props.easing} ${Math.floor(props.duration.leave * 0.167)}ms`
  element.style.height = '0'
  element.style.opacity = '0'
  element.style.transform = `translateY(-${props.translateDistance}px) scale(${props.scale})`
  element.style.paddingTop = '0'
  element.style.paddingBottom = '0'
}

defineExpose({
  beforeEnter,
  enter,
  leave,
})
</script>

<style scoped>
.expand-content {
  overflow: hidden;
  position: relative;
}

/* Default CSS Transition Styles */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-enter-from {
  opacity: 0;
  height: 0;
  transform: translateY(-15px) scale(0.95);
}

.expand-leave-to {
  opacity: 0;
  height: 0;
  transform: translateY(-15px) scale(0.95);
}
</style>
