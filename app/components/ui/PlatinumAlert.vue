<template>
  <div class="platinum-alert">
    <div class="alert-icon">✓</div>
    <div class="alert-content">
      <strong>Great news!</strong> This game should work without changing the settings.
      <span v-if="isPlatinum"> (Platinum verified)</span>
      <span v-if="isNative"> (Native support)</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlatinumAlert',
  props: {
    isPlatinum: {
      type: Boolean,
      default: false,
    },
    isNative: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style scoped>
.platinum-alert {
  background-color: #d1fae5;
  border: 1px solid #10b981;
  border-radius: 8px;
  padding: 16px;
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-icon {
  background-color: #10b981;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.alert-content {
  color: #065f46;
  font-size: 1rem;
  line-height: 1.5;
}

.alert-content strong {
  font-weight: 600;
}
</style>