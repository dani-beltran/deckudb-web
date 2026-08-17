<template>
  <Transition name="notification">
    <div
      v-if="isVisible"
      class="notification"
      role="alert"
      aria-live="polite"
    >
      {{ message }}
    </div>
  </Transition>
</template>

<script>
import { onUnmounted, ref, watch } from 'vue'

export default {
  name: 'Notification',
  props: {
    message: {
      type: String,
      required: true,
    },
    show: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      default: 3000,
    },
  },
  emits: ['hide'],
  setup(props, { emit }) {
    const isVisible = ref(false)
    let timeoutId = null

    const hideNotification = () => {
      isVisible.value = false
      emit('hide')
    }

    watch(
      () => props.show,
      (newValue) => {
        if (newValue) {
          isVisible.value = true

          // Clear existing timeout if any
          if (timeoutId) {
            clearTimeout(timeoutId)
          }

          // Set new timeout to hide notification
          timeoutId = setTimeout(() => {
            hideNotification()
          }, props.duration)
        }
      }
    )

    onUnmounted(() => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    })

    return {
      isVisible,
    }
  },
}
</script>

<style scoped>
.notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--primary-color);
  color: var(--primary-text-color);
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-weight: 500;
  font-size: 0.95rem;
  z-index: 1000;
  max-width: 400px;
  word-wrap: break-word;
}

/* Transition animations */
.notification-enter-active {
  animation: slide-in 0.3s ease-out;
}

.notification-leave-active {
  animation: slide-out 0.3s ease-in;
}

@keyframes slide-in {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-out {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .notification {
    bottom: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
  }
}
</style>
