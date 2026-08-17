<template>
    <div class="popular-game-card" @click="$emit('click', game)" role="button" tabindex="0"
        @keydown.enter="$emit('click', game)" @keydown.space.prevent="$emit('click', game)"
        :aria-label="`View ${game.name} settings`">
        <div class="game-image-wrapper">
            <img v-if="game.header_image" :src="game.header_image" :alt="`${game.name} cover`"
                class="popular-game-image" @error="$event.target.style.display = 'none'"
                loading="lazy" />
            <div v-else class="image-placeholder">
                <span>{{ game.name.charAt(0) }}</span>
            </div>
        </div>
        <div class="popular-game-info">
            <h3 class="popular-game-name">{{ game.name }}</h3>
            <p class="game-steam-id">Steam ID: {{ game.steam_appid }}</p>
        </div>
    </div>
</template>

<script>
export default {
  name: 'PopularGameCard',
  props: {
    game: {
      type: Object,
      required: true,
    },
  },
  emits: ['click'],
}
</script>

<style scoped>
.popular-game-card {
    background: var(--bg-card);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid transparent;
    width: 100%;
}

.popular-game-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    border-color: var(--primary-color);
}

.game-image-wrapper {
    width: 100%;
    height: 180px;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}

.popular-game-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
    display: block;
    max-width: 100%;
}

.popular-game-card:hover .popular-game-image {
    transform: scale(1.05);
}

.image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
    font-weight: bold;
    color: var(--bg-card);
}

.popular-game-info {
    padding: 16px;
}

.popular-game-name {
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.game-steam-id {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>
