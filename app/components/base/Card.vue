<template>
  <div :class="['card', cardClass, { 'card-hoverable': hoverable }]">
    <div v-if="$slots.header || title" class="card-header">
      <h3 v-if="title">{{ title }}</h3>
      <slot name="header" v-if="!title"></slot>
    </div>
    <div class="card-content">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Card',
  props: {
    title: {
      type: String,
      default: null,
    },
    cardClass: {
      type: String,
      default: '',
    },
    hoverable: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style scoped>
.card {
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--secondary-border-color);
  border-radius: 12px;
  margin-bottom: 20px;
}

.card-hoverable {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.card-hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  margin-bottom: 15px;
}

.card-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
}

.card-content {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 1rem;
}

.card-footer {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--secondary-border-color);
}
</style>
