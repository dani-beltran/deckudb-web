<template>
  <div class="loading">
    <div class="spinner" :style="spinnerStyle"></div>
    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script lang="ts">
import { type CSSProperties, defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'Spinner',
  props: {
    message: {
      type: String,
      default: '',
    },
    size: {
      type: [Number, String] as PropType<number | string>,
      default: 40,
    },
  },
  computed: {
    spinnerStyle(): CSSProperties {
      const sizeValue = typeof this.size === 'number' ? `${this.size}px` : this.size
      const borderWidth = Math.max(2, Math.round(parseInt(String(this.size), 10) / 10))
      return {
        width: sizeValue,
        height: sizeValue,
        borderWidth: `${borderWidth}px`,
      }
    },
  },
})
</script>

<style scoped>
.loading {
  text-align: center;
}

.spinner {
  border-style: solid;
  border-color: var(--bg-card-hover);
  border-top-color: var(--primary-color-start);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
