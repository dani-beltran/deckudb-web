<template>
  <div v-if="suggestions.length > 0">
    <div class="suggestions-header">
      <span class="suggestions-title">{{ title }}</span>
      <span v-if="loading" class="suggestions-loading">Loading...</span>
    </div>
    <ul class="suggestions-list" role="listbox">
      <li 
        v-for="(suggestion, index) in suggestions" 
        :key="suggestion.id"
        :class="['suggestion-item', { 'selected': index === selectedIndex }]"
        @click="selectSuggestion(suggestion, index)"
        @mouseenter="updateSelectedIndex(index)"
        role="option"
        :aria-selected="index === selectedIndex"
      >
        <div class="suggestion-content">
          <img 
            v-if="suggestion.tiny_image" 
            :src="suggestion.tiny_image" 
            :alt="suggestion.name"
            class="suggestion-image"
            loading="lazy"
          />
          <div class="suggestion-text">
            <div class="suggestion-name">{{ suggestion.name }}</div>
            <div v-if="suggestion.release_date" class="suggestion-meta">
              {{ suggestion.release_date.date || suggestion.release_date }}
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
  <div v-else>
    <div class="suggestions-header">
      <span class="suggestions-title">{{ title }}</span>
      <span v-if="loading" class="suggestions-loading">Loading...</span>
    </div>
    <div class="suggestions-list">
      <p v-if="!loading" class="no-suggestions">No suggestions available.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchSuggestions',
  props: {
    suggestions: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    selectedIndex: {
      type: Number,
      default: -1,
    },
    title: {
      type: String,
      default: 'Suggestions',
    },
  },
  emits: ['select-suggestion', 'update-selected-index', 'close-suggestions'],
  methods: {
    selectSuggestion(suggestion, index) {
      this.$emit('select-suggestion', suggestion, index)
    },

    updateSelectedIndex(index) {
      this.$emit('update-selected-index', index)
    },

    handleKeyDown(event) {
      if (this.suggestions.length === 0) return

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          const nextIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1)
          this.updateSelectedIndex(nextIndex)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          const prevIndex = Math.max(this.selectedIndex - 1, -1)
          this.updateSelectedIndex(prevIndex)
          break
        }
        case 'Enter':
          event.preventDefault()
          if (this.selectedIndex >= 0) {
            this.selectSuggestion(this.suggestions[this.selectedIndex], this.selectedIndex)
          }
          break
        case 'Escape':
          this.$emit('close-suggestions')
          break
      }
    },
  },
  mounted() {
    // Listen for keydown events on the document when component is active
    document.addEventListener('keydown', this.handleKeyDown)
  },
  beforeUnmount() {
    // Clean up event listener
    document.removeEventListener('keydown', this.handleKeyDown)
  },
}
</script>

<style scoped>
.suggestions-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--bg-card-hover);
  background: var(--bg-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.suggestions-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.suggestions-loading {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
}

.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid var(--bg-card-hover);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background-color: var(--bg-card-hover);
}

.suggestion-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.suggestion-image {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.suggestion-text {
  flex: 1;
  min-width: 0;
}

.suggestion-name {
  font-weight: 500;
  color: var(--secondary-text-color);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-suggestions {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary); 
}

@media (max-width: 768px) {
  .suggestions-dropdown {
    max-height: 300px;
  }
  
  .suggestion-item {
    padding: 16px;
  }
  
  .suggestion-content {
    gap: 8px;
  }
  
  .suggestion-image {
    width: 28px;
    height: 28px;
  }
}
</style>