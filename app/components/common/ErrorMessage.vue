<template>
  <div v-if="message" class="error">
    <p>{{ message }}</p>
    <button @click="dismiss" class="error-dismiss">Dismiss</button>
  </div>
</template>

<script>
export default {
  name: 'ErrorMessage',
  props: {
    message: {
      type: String,
      default: null,
    },
  },
  methods: {
    dismiss() {
      this.$emit('dismiss')
    },
  },
}
</script>

<style scoped>
.error {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 20px;
}

.dark-mode .error {
  background: #7f1d1d;
  border: 1px solid #991b1b;
  color: #fca5a5;
}

.error-dismiss {
  background: #dc2626;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.2s ease;
}

.error-dismiss:hover {
  background: #b91c1c;
}

.dark-mode .error-dismiss {
  background: #b91c1c;
}

.dark-mode .error-dismiss:hover {
  background: #991b1b;
}
</style>