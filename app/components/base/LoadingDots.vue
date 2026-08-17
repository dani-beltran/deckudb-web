<template>
  <div class="loading-dots" :class="{ 'with-message': message }">
    <div class="dots-container">
      <span class="dot" :style="dotStyle"></span>
      <span class="dot" :style="dotStyle"></span>
      <span class="dot" :style="dotStyle"></span>
    </div>
    <p v-if="message" class="loading-message">{{ message }}</p>
  </div>
</template>

<script>
export default {
  name: 'LoadingDots',
  props: {
    message: {
      type: String,
      default: '',
    },
    size: {
      type: [Number, String],
      default: 8,
    },
    color: {
      type: String,
      default: '',
    },
  },
  computed: {
    dotStyle() {
      const sizeValue = typeof this.size === 'number' ? `${this.size}px` : this.size
      return {
        width: sizeValue,
        height: sizeValue,
        backgroundColor: this.color || 'var(--primary-color)',
      }
    },
  },
}
</script>

<style scoped>
.loading-dots {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.loading-dots.with-message {
  flex-direction: column;
  gap: 12px;
}

.dots-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

.dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.loading-message {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
</style>
