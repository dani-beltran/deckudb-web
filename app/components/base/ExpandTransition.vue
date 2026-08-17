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

<script>
export default {
  name: 'ExpandTransition',
  props: {
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
      type: Object,
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
  },
  methods: {
    beforeEnter(el) {
      el.style.height = '0'
      el.style.opacity = '0'
      el.style.transform = `translateY(-${this.translateDistance}px) scale(${this.scale})`
      el.style.paddingTop = '0'
      el.style.paddingBottom = '0'
    },
    enter(el) {
      el.offsetHeight // force reflow
      const targetHeight = el.scrollHeight
      el.style.transition = `height ${this.duration.enter}ms ${this.easing}, opacity ${Math.floor(this.duration.enter * 0.75)}ms ease-out ${Math.floor(this.duration.enter * 0.25)}ms, transform ${this.duration.enter}ms ${this.easing} ${Math.floor(this.duration.enter * 0.125)}ms, padding ${this.duration.enter}ms ${this.easing}`
      el.style.height = `${targetHeight}px`
      el.style.opacity = '1'
      el.style.transform = 'translateY(0) scale(1)'
      el.style.paddingTop = ''
      el.style.paddingBottom = ''

      // Clean up after animation
      setTimeout(() => {
        el.style.height = 'auto'
      }, this.duration.enter)
    },
    leave(el) {
      const currentHeight = el.offsetHeight
      el.style.height = `${currentHeight}px`
      el.offsetHeight // force reflow
      el.style.transition = `height ${this.duration.leave}ms ${this.easing} ${Math.floor(this.duration.leave * 0.167)}ms, opacity ${Math.floor(this.duration.leave * 0.667)}ms ease-in, transform ${this.duration.leave}ms ${this.easing}, padding ${this.duration.leave}ms ${this.easing} ${Math.floor(this.duration.leave * 0.167)}ms`
      el.style.height = '0'
      el.style.opacity = '0'
      el.style.transform = `translateY(-${this.translateDistance}px) scale(${this.scale})`
      el.style.paddingTop = '0'
      el.style.paddingBottom = '0'
    },
  },
}
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