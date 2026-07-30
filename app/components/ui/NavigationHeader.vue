<template>
  <header class="navigation-header" role="banner">
    <router-link to="/" class="logo-link" aria-label="Go to home page">
      <img src="@assets/decku-logo-text.png" alt="Decku Logo" class="logo logo-desktop" />
      <img src="@assets/decku-logo.png" alt="Decku Logo" class="logo logo-mobile" />
    </router-link>
    <div class="search-bar-container">
      <GameSearch 
        :model-value="searchTerm"
        @update:model-value="$emit('update:searchTerm', $event)"
        @search="$emit('search', $event)"
        :loading="loading"
      />
    </div>
  </header>
</template>

<script>
import GameSearch from '../ui/GameSearch.vue'

export default {
  name: 'NavigationHeader',
  components: {
    GameSearch,
  },
  props: {
    searchTerm: {
      type: String,
      default: '',
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:searchTerm', 'search'],
}
</script>

<style scoped>
.navigation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0px;
  background: var(--background-color);
  border-bottom: 1px solid var(--border-color);
  max-width: 100%;
  gap: 24px;
}

.logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
}

.logo {
  height: 64px;
  width: auto;
  object-fit: contain;
  transition: opacity 0.2s ease;
}

.logo-mobile {
  display: none;
}

.logo-link:hover .logo {
  opacity: 0.8;
}

.search-bar-container {
  flex: 1;
  max-width: 600px;
}

@media (max-width: 768px) {
  .navigation-header {
    gap: 16px;
    padding: 12px 0px;
  }

  .logo-link {
    justify-content: center;
  }

  .logo-desktop {
    display: none;
  }

  .logo-mobile {
    display: block;
  }
}
</style>
