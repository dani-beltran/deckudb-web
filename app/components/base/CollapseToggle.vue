<template>
  <button 
    class="collapse-toggle"
    @click="$emit('toggle')"
    :aria-expanded="!isCollapsed"
    :aria-label="ariaLabel"
  >
    <svg 
      :class="['collapse-icon', { rotated: isCollapsed }]" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</template>

<script>
export default {
  name: 'CollapseToggle',
  emits: ['toggle'],
  props: {
    isCollapsed: {
      type: Boolean,
      required: true,
    },
    ariaLabel: {
      type: String,
      default: 'Toggle section visibility',
    },
  },
}
</script>

<style scoped>
.collapse-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.collapse-toggle:hover {
  background: var(--secondary-bg-hover);
  color: var(--text-primary);
}

.collapse-toggle:focus {
  outline: 2px solid var(--primary-color-start);
  outline-offset: 2px;
}

.collapse-icon {
  transition: transform 0.2s ease;
}

.collapse-icon.rotated {
  transform: rotate(-90deg);
}
</style>