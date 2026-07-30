<template>
    <span class="source-badge" :class="`source-${sourceName}`">
        <component :is="icon" v-if="icon" class="source-badge-icon" v-bind="{ color: iconColor }"/>
        <slot></slot>
    </span>
</template>

<script>
import { Gamepad2 } from 'lucide-vue-next'
import ProtonIcon from '@/components/icons/ProtonIcon.vue'
import RedditIcon from '@/components/icons/RedditIcon.vue'
import WebsiteIcon from '@/components/icons/WebsiteIcon.vue'
import YoutubeIcon from '@/components/icons/YoutubeIcon.vue'

const SOURCE_ICONS = {
  reddit: RedditIcon,
  youtube: YoutubeIcon,
  protondb: ProtonIcon,
  sharedeck: Gamepad2,
  other: WebsiteIcon,
}

export default {
  name: 'SourceBadge',
  props: {
    sourceName: {
      type: String,
      required: true,
    },
  },
  computed: {
    icon() {
      return SOURCE_ICONS[this.sourceName] ?? null
    },
    iconColor() {
      switch (this.sourceName) {
        case 'reddit':
          return '#FF4500'
        case 'youtube':
          return '#FF0034'
        case 'protondb':
          return '#485265'
        case 'sharedeck':
          return '#FB923C'
        default:
          return 'currentColor'
      }
    },
  },
}
</script>
<style scoped>
.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: #e0e7ff;
  color: #3730a3;
}

.source-protondb {
  background: #485265;
  color: #c28c04;
}

.source-sharedeck {
  background: #e6f0ff;
  color: #1a75ff;
}

.source-reddit {
  background: #FFFFFF;
  color: #FF4500;
}

.source-youtube {
  background: #FFFFFF;
  color: #000000;
}

.source-other {
  background: #e8e9eb;
  color: #374151;
}

.source-badge-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}
</style>