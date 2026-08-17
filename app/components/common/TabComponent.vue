<template>
  <div class="tab-component">
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button 
        v-for="tab in availableTabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="setActiveTab(tab.id)"
      >
        <component 
          v-if="tab.icon" 
          :is="tab.icon" 
          :size="18" 
          class="tab-icon"
        />
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.count !== undefined" class="tab-count">({{ tab.count }})</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content-container">
      <div class="tab-content-wrapper">
        <div class="tab-content-panel active">
          <slot :activeTab="activeTab"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue'

export default {
  name: 'TabComponent',
  props: {
    tabs: {
      type: Array,
      required: true,
      validator(tabs) {
        return tabs.every((tab) => Object.hasOwn(tab, 'id') && Object.hasOwn(tab, 'label'))
      },
    },
    defaultTab: {
      type: String,
      default: null,
    },
  },
  emits: ['tab-changed'],
  setup(props, { emit }) {
    // Component state
    const activeTab = ref(null)

    // Computed properties
    const availableTabs = computed(() => {
      return props.tabs.filter((tab) => !tab.hidden)
    })

    // Tab management methods
    const initializeActiveTab = () => {
      // Use the provided default tab if it exists and is available
      if (props.defaultTab && availableTabs.value.some((tab) => tab.id === props.defaultTab)) {
        activeTab.value = props.defaultTab
        return
      }

      // Otherwise, use the first available tab
      if (availableTabs.value.length > 0) {
        activeTab.value = availableTabs.value[0].id
      } else {
        activeTab.value = null
      }
    }

    const setActiveTab = (tabId) => {
      activeTab.value = tabId
      emit('tab-changed', tabId)
    }

    // Watchers
    watch(
      [() => props.tabs, () => props.defaultTab],
      () => {
        initializeActiveTab()
      },
      { immediate: true, deep: true }
    )

    return {
      // State
      activeTab,
      availableTabs,

      // Methods
      setActiveTab,
    }
  },
}
</script>

<style scoped>
.tab-component {
  width: 100%;
}

/* Tab Navigation Styles */
.tab-navigation {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--secondary-border-color);
}

.tab-button {
  background: transparent;
  border: none;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-icon {
  flex-shrink: 0;
}

.tab-button:hover {
  color: var(--secondary-text-color);
  background: var(--bg-secondary);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: var(--primary-bg-active);
}

.tab-count {
  background: var(--secondary-border-color);
  color: var(--text-secondary);
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.tab-button.active .tab-count {
  background: var(--primary-color);
  color: white;
}

.tab-content-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  margin-top: 20px;
}

.tab-content-wrapper {
  width: 100%;
}

.tab-content-panel {
  width: 100%;
}

.tab-content-panel.active {
  opacity: 1;
}

@media (max-width: 768px) {
  .tab-navigation {
    flex-wrap: wrap;
  }

  .tab-button {
    padding: 10px 16px;
    font-size: 0.9rem;
    flex: 1;
    min-width: 0;
    text-align: center;
  }

  .tab-button.active {
    flex: 3;
  }

  .tab-label {
    display: none;
  }

  .tab-button.active .tab-label {
    display: inline;
  }

  .tab-count {
    display: none;
  }
}
</style>