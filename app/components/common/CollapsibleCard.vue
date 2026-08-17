<template>
  <section :class="['collapsible-card', cardClass]" :aria-label="ariaLabel">
    <div class="collapsible-header">
      <h3 v-if="title">{{ title }}</h3>
      <slot name="header" v-if="!title"></slot>
      <CollapseToggle 
        :is-collapsed="isCollapsed"
        :aria-label="toggleAriaLabel"
        @toggle="toggleCollapsed"
      />
    </div>
    <div v-show="!isCollapsed" class="collapsible-content">
      <slot></slot>
    </div>
  </section>
</template>

<script>
import CollapseToggle from '../base/CollapseToggle.vue'

export default {
  name: 'CollapsibleCard',
  components: {
    CollapseToggle,
  },
  props: {
    title: {
      type: String,
      default: null,
    },
    initiallyCollapsed: {
      type: Boolean,
      default: false,
    },
    cardClass: {
      type: String,
      default: '',
    },
    ariaLabel: {
      type: String,
      default: null,
    },
    toggleAriaLabel: {
      type: String,
      default: 'Toggle section visibility',
    },
  },
  data() {
    return {
      isCollapsed: this.initiallyCollapsed,
    }
  },
  methods: {
    toggleCollapsed() {
      this.isCollapsed = !this.isCollapsed
      this.$emit('toggle', this.isCollapsed)
    },
  },
}
</script>

<style scoped>
.collapsible-card {
  margin-bottom: 30px;
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--secondary-border-color);
  border-radius: 12px;
}

.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.collapsible-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapsible-content {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 1rem;
}

/* Remove margin-bottom from header when collapsed */
.collapsible-card:has(.collapsible-content[style*="display: none"]) .collapsible-header {
  margin-bottom: 0;
}

/* Fallback for browsers that don't support :has() */
@supports not selector(:has(*)) {
  .collapsible-header {
    margin-bottom: 15px;
  }
}
</style>