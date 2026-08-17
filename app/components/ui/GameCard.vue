<template>
  <article 
    class="game-card"
    :class="{ 'game-card-selected': isSelected }"
    :style="{ '--animation-delay': animationDelay + 's' }"
    @click="$emit('select', game)"
    :aria-label="`Select ${game.name} for Steam Deck settings`"
    role="button"
    tabindex="0"
    @keydown.enter="$emit('select', game)"
    @keydown.space.prevent="$emit('select', game)"
  >
    <img 
      v-if="game.tiny_image || game.header_image" 
      :src="game.tiny_image || game.header_image" 
      :alt="`${game.name} game cover`"
      class="game-image"
      @error="$event.target.style.display = 'none'"
      loading="lazy"
    />
    <div class="game-info">
      <h4 class="game-name">{{ game.name }}</h4>
      <p class="game-id">Steam ID: {{ game.id }}</p>
      <div class="game-platforms" v-if="game.platforms" aria-label="Supported platforms">
        <span v-if="game.platforms.windows" class="platform" aria-label="Windows compatible">Windows</span>
        <span v-if="game.platforms.mac" class="platform" aria-label="Mac compatible">Mac</span>
        <span v-if="game.platforms.linux" class="platform" aria-label="Linux compatible">Linux</span>
      </div>
    </div>
  </article>
</template>

<script>
export default {
  name: 'GameCard',
  props: {
    game: {
      type: Object,
      required: true,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
    animationDelay: {
      type: Number,
      default: 0,
    },
  },
  emits: ['select'],
}
</script>

<style scoped>
.game-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.game-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px var(--highlight-box-shadow-hover);
  border-color: var(--highlight-color);
}

.game-card-selected {
  border-color: var(--highlight-color) !important;
  box-shadow: 0 0 0 3px var(--highlight-box-shadow-selected), 0 8px 25px var(--highlight-box-shadow-selected-deep) !important;
  transform: translateY(-2px);
  background: var(--highlight-selected-bg-gradient);
}

.game-card-selected:hover {
  box-shadow: 0 0 0 3px var(--highlight-box-shadow-selected-deep), 0 12px 35px var(--highlight-box-shadow-selected-hover) !important;
}

.game-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.game-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.game-name {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
  max-height: 2.6em;
}

.game-id {
  margin: 0 0 8px 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.game-platforms {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 100%;
  overflow: hidden;
}

.platform {
  background: var(--secondary-bg-hover);
  color: var(--secondary-text-color);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.platform:nth-child(1) {
  background: #dbeafe;
  color: #1d4ed8;
}

.dark-mode .platform:nth-child(1) {
  background: #1e3a8a;
  color: #93c5fd;
}

.platform:nth-child(2) {
  background: #dcfce7;
  color: #166534;
}

.dark-mode .platform:nth-child(2) {
  background: #14532d;
  color: #86efac;
}

.platform:nth-child(3) {
  background: #fef3c7;
  color: #92400e;
}

.dark-mode .platform:nth-child(3) {
  background: #78350f;
  color: #fde68a;
}

@media (max-width: 768px) {
  .game-card {
    padding: 12px;
  }

  .game-image {
    width: 40px;
    height: 40px;
  }

  .game-name {
    font-size: 0.9rem;
  }
}
</style>