<template>
  <div v-if="message" class="warning">
    <p>{{ message }}</p>
    <button @click="dismiss" class="warning-dismiss">Dismiss</button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WarningMessage' })

const { message = null } = defineProps<{
  message?: string | null
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const dismiss = (): void => {
  emit('dismiss')
}

defineExpose({ dismiss })
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
