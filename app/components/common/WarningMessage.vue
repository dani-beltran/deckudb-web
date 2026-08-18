<template>
  <div v-if="message" class="warning">
    <p>{{ message }}</p>
    <button @click="dismiss" class="warning-dismiss">Dismiss</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'WarningMessage',
  props: {
    message: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: {
    dismiss: () => true,
  },
  methods: {
    dismiss() {
      this.$emit('dismiss')
    },
  },
})
</script>

<style scoped>
.warning {
  background: #fef3c7;
  border: 1px solid #fde68a;
  color: #b45309;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 20px;
}

.dark-mode .warning {
  background: #78350f;
  border: 1px solid #92400e;
  color: #fcd34d;
}

.warning-dismiss {
  background: #d97706;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.2s ease;
}

.warning-dismiss:hover {
  background: #b45309;
}

.dark-mode .warning-dismiss {
  background: #b45309;
}

.dark-mode .warning-dismiss:hover {
  background: #92400e;
}
</style>
