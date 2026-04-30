<template>
  <div class="add-report-card">
    <h3 class="add-report-title">Add your own report</h3>
    <div class="source-badges">
      <a
        :href="`https://www.protondb.com/contribute?appId=${gameId}`"
        target="_blank"
        rel="noopener noreferrer"
        class="source-badge source-protondb"
        aria-label="Add report on ProtonDB"
      >
        <SourceBadge sourceName="protondb">ProtonDB<SquarePen class="icon-square-pen"/></SourceBadge>
      </a>
      <a
        :href="`https://sharedeck.games/apps/${gameId}/reports/new`"
        target="_blank"
        rel="noopener noreferrer"
        class="source-badge source-sharedeck"
        aria-label="Add report on ShareDeck"
      >
        <SourceBadge sourceName="sharedeck">ShareDeck<SquarePen class="icon-square-pen"/></SourceBadge>
      </a>
      <a
        :href="`https://www.reddit.com/r/SteamDeck/submit/?type=TEXT`"
        target="_blank"
        rel="noopener noreferrer"
        class="source-badge source-reddit"
        aria-label="Add report on Reddit"
      >
        <SourceBadge sourceName="reddit">Reddit<SquarePen class="icon-square-pen"/></SourceBadge>
      </a>
    </div>
  </div>
</template>

<script>
import { SquarePen } from 'lucide-vue-next'
import SourceBadge from '../common/SourceBadge.vue'

export default {
  name: 'AddReport',
  components: {
    SquarePen,
    SourceBadge,
  },
  props: {
    gameId: {
      type: String,
      required: true,
    },
  },
}
</script>

<style scoped>
.add-report-card {
  background: var(--bg-card);
  border: 1px solid var(--secondary-border-color);
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.add-report-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.source-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  
}

.source-badge {
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
}

.source-badge:hover {
  transform: translateY(-1px);
}

.source-reddit {
  background: #F7F8F9;
  border-radius: 12px;
}

.icon-square-pen {
  width: 0.75rem;
  height: 0.75rem;
  vertical-align: middle;
  margin-left: 2px;
}
</style>
