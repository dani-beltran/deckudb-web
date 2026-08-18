<template>
  <Button :disabled="isDisabled" @click="handleClick" variant="secondary" size="medium">
    <span class="refresh-content">
      <RotateCw class="refresh-icon" :class="{ loading: loading }"/>
      <span v-if="isDisabled">Try again in {{ countdown }} seconds</span>
      <span v-else>Try again</span>
    </span>
  </Button>
</template>

<script setup lang="ts">
import { RotateCw } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Button from '@/components/base/Button.vue'

defineOptions({ name: 'RefreshButton' })

const props = withDefaults(
  defineProps<{
    countdownStart?: number
  }>(),
  {
    countdownStart: 10,
  }
)

defineEmits<{
  refresh: []
}>()

const countdown = ref(props.countdownStart)
const isDisabled = ref(true)
const loading = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const startCountdown = (): void => {
  isDisabled.value = true
  countdown.value = props.countdownStart
  const countdownTimer = setInterval(() => {
    if (countdown.value > 1) {
      countdown.value--
    } else {
      isDisabled.value = false
      clearInterval(countdownTimer)
    }
  }, 1000)
  timer = countdownTimer
}

const reset = (): void => {
  if (timer !== null) clearInterval(timer)
  startCountdown()
}

const handleClick = (): void => {
  if (isDisabled.value) {
    return
  }
  // delay to show loading spinner
  loading.value = true
  setTimeout(() => {
    window.location.reload()
  }, 1000)
}

onMounted(startCountdown)

onBeforeUnmount(() => {
  if (timer !== null) clearInterval(timer)
})

defineExpose({ startCountdown, reset, handleClick })
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
