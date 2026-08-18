<template>
  <section class="game-description" aria-label="Game information">
    <!-- Game Header with Title and Image -->
    <div class="game-header">
      <GameVideoPreview :game="game" />
      <div class="game-title-section">
        <h1 class="game-title">
          <a :href="steamStoreUrl" target="_blank" rel="noopener noreferrer" class="steam-title-link">
            {{ gameTitle }}
          </a>
        </h1>

        <!-- Game Description -->
        <div v-if="game.steam_app.short_description" class="summary-section">
          <p class="summary-text">{{ game.steam_app.short_description }}</p>
        </div>
      </div>
    </div>

    <!-- Game Rating and Verification -->
    <div class="game-badges" v-if="game.steamdeck_rating || game.steamdeck_verified">
      <Tooltip v-if="game.steamdeck_rating" :text="getRatingTooltip(game.steamdeck_rating)" position="top-right">
        <div class="rating-badge" :class="`rating-${game.steamdeck_rating}`">
          <RatingBadgeIcon class="rating-badge-icon" />
          <span>
            {{ game.steamdeck_rating.toUpperCase() }}
          </span>
        </div>
      </Tooltip>
      <Tooltip v-if="game.steamdeck_verified" text="Steam Deck verified game">
        <div class="verified-badge">
          <VerifiedIcon class="verified-icon" />
          Verified
        </div>
      </Tooltip>
    </div>
  </section>
</template>

<script>
import Tooltip from '../base/Tooltip.vue'
import RatingBadgeIcon from '../icons/RatingBadgeIcon.vue'
import VerifiedIcon from '../icons/VerifiedIcon.vue'
import GameVideoPreview from './GameVideoPreview.vue'

export default {
  name: 'GameDescription',
  components: {
    RatingBadgeIcon,
    VerifiedIcon,
    Tooltip,
    GameVideoPreview,
  },
  props: {
    game: {
      type: Object,
      default: null,
    },
  },
  computed: {
    gameTitle() {
      return this.game.steam_app?.name
    },
    gameId() {
      return this.game?.game_id || ''
    },
    steamStoreUrl() {
      return this.gameId ? `https://store.steampowered.com/app/${this.gameId}/` : '#'
    },
  },
  methods: {
    getRatingTooltip(rating) {
      const tooltips = {
        native: 'Game works natively on SteamOS, Proton is not required',
        silver: 'Game works with minor issues using Proton on SteamOS, but generally playable',
        gold: 'Game works flawlessly after a few changes using Proton on SteamOS',
        platinum: 'Game works flawlessly out of the box using Proton on SteamOS',
        unsupported: 'Game is not supported by Proton on SteamOS',
        borked: 'Game is broken or is unplayable',
      }
      return tooltips[rating] || ''
    },
  },
}
</script>

<style scoped>
.game-description {
  width: 100%;
}

.game-header {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.steam-title-link {
  color: var(--secondary-text-color);
  text-decoration: none;
  transition: color 0.2s ease;
}

.steam-title-link:hover {
  color: #1171d3;
}

.game-title-section {
  flex: 1;
  min-width: 0;
}

.game-title {
  color: var(--secondary-text-color);
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  line-height: 1.3;
  font-weight: 600;
}

.game-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 25px;
}

.rating-badge,
.verified-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.rating-badge-icon {
  display: flex;
  align-items: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.rating-badge.rating-silver {
  background: linear-gradient(135deg, #c0c0c0, #e5e7eb);
  color: #374151;
}

.rating-badge.rating-gold {
  background: linear-gradient(135deg, #ffd700, #ffed4a);
  color: #92400e;
}

.rating-badge.rating-platinum {
  background: linear-gradient(135deg, #e5e7eb, #f3f4f6);
  color: #374151;
}

.rating-badge.rating-native {
  background: linear-gradient(135deg, #86efac, #bbf7d0);
  color: #166534;
}

.rating-badge.rating-unsupported, .rating-badge.rating-borked {
  background: linear-gradient(135deg, #f87171, #fca5a5);
  color: #991b1b;
}

.verified-badge {
  background: rgba(0, 0, 0, 0.6);
  color: white;
}

.verified-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.summary-section {
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border-left: 4px solid #6366f1;
}

.summary-section h3 {
  color: var(--secondary-text-color);
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.summary-text {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 768px) {
  .game-header {
    flex-direction: column;
    gap: 15px;
  }

  .game-title {
    font-size: 1.3rem;
  }
}

@media (max-width: 480px) {
  .game-title {
    font-size: 1.2rem;
  }

  .summary-section {
    padding: 15px;
  }
}
</style>
