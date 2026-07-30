<template>
  <Button :disabled="isDisabled" @click="handleClick" variant="secondary" size="medium">
    <span class="refresh-content">
      <RotateCw class="refresh-icon" :class="{ loading: loading }"/>
      <span v-if="isDisabled">Try again in {{ countdown }} seconds</span>
      <span v-else>Try again</span>
    </span>
  </Button>
</template>

<script>
import { RotateCw } from 'lucide-vue-next'
import Button from '@/components/base/Button.vue'
export default {
  components: { Button, RotateCw },
  name: 'RefreshButton',
  emits: ['refresh'],
  props: {
    countdownStart: {
      type: Number,
      default: 10,
    },
  },
  data() {
    return {
      countdown: this.countdownStart,
      isDisabled: true,
      timer: null,
      loading: false,
    }
  },
  mounted() {
    this.startCountdown()
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    startCountdown() {
      this.isDisabled = true
      this.countdown = this.countdownStart
      this.timer = setInterval(() => {
        if (this.countdown > 1) {
          this.countdown--
        } else {
          this.isDisabled = false
          clearInterval(this.timer)
        }
      }, 1000)
    },
    reset() {
      clearInterval(this.timer)
      this.startCountdown()
    },
    handleClick() {
      if (this.isDisabled) {
        return
      }
      // delay to show loading spinner
      this.loading = true
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    },
  },
}
</script>

<style scoped>
button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-content {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-size: 1em;
}

.refresh-icon {
  width: 1.1em;
  height: 1.1em;
}

.refresh-icon.loading {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
