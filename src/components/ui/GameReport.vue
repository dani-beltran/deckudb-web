<template>
  <div class="report-card" @click="openLink(report.url)">
    <!-- Reporter Info -->
    <div class="report-header">
      <div class="reporter-info">
        <div
          target="_blank"
          rel="noopener noreferrer"
          class="reporter-link"
          :aria-label="`View ${report.reporter.username}'s profile`"
          @click="openLink(report.reporter.user_profile_url)"
        >
          <img
            v-if="report.reporter.user_profile_avatar_url && !imageError"
            class="reporter-avatar"
            :src="report.reporter.user_profile_avatar_url"
            :alt="`${report.reporter.username}'s avatar`"
            @error="handleImageError"
          />
          <div v-else class="reporter-avatar-placeholder">
            {{ getInitials(report.reporter.username) }}
          </div>
          <span class="reporter-name">{{ report.reporter.username }}</span>
        </div>
        <div class="report-posted-date">
            <span v-if="report.posted_at" class="posted-date" :title="formatFullDate(report.posted_at)">
                {{ formatDate(report.posted_at) }}
            </span>
        </div>  
      </div>

      <div class="report-metadata">
        <div class="report-badges">
            <span
            v-if="fps"
            class="frame-rate-badge"
            >
            {{ fps }} FPS
            </span>
            <span v-if="tdp" class="tdp-badge">
            {{ tdp }} W
            </span>
            <span
            v-if="report.steamdeck_hardware"
            class="hardware-badge"
            :class="`hardware-${report.steamdeck_hardware}`"
            >
            {{ formatHardware(report.steamdeck_hardware) }}
            </span>
        </div>
        <div class="report-source">
            <SourceBadge :sourceName="report.source">
              {{ report.source }}
            </SourceBadge>
        </div>
      </div>

    </div>

    <!-- Report Content -->
    <div class="report-content">
      <p class="notes">
        <span class="notes-text">
          {{ cutText(`${report.title || ""} ${report.notes}`, 100) }}
        </span>
        <span class="see-more-text">See more details</span>
      </p>
    </div>
  </div>
</template>

<script>
import SourceBadge from '../common/SourceBadge.vue'

export default {
  name: 'GameReport',
  components: {
    SourceBadge,
  },
  props: {
    report: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      imageError: false,
    }
  },
  computed: {
    fps: function () {
      return (
        this.report?.steamdeck_settings?.frame_rate_cap ||
        this.report?.steamdeck_experience?.average_frame_rate ||
        null
      )
    },
    tdp: function () {
      return this.report?.steamdeck_settings?.tdp_limit || null
    },
  },
  methods: {
    openLink(url) {
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    cutText(text, maxLength) {
      const trimmedText = text.trim()
      if (trimmedText.length <= maxLength) return trimmedText
      return `${trimmedText.slice(0, maxLength).replace(/\n/g, ' ')}...`
    },
    formatHardware(hardware) {
      return hardware.toUpperCase()
    },
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
      return `${Math.floor(diffDays / 365)} years ago`
    },
    formatFullDate(dateString) {
      if (!dateString) return ''
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    },
    getInitials(username) {
      if (!username) return '?'
      const words = username.split(' ')
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return username.substring(0, 2).toUpperCase()
    },
    handleImageError() {
      this.imageError = true
    },
  },
}
</script>

<style scoped>
.report-card {
  background: var(--bg-primary);
  border: 1px solid var(--secondary-border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.report-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 8px;
}

.reporter-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reporter-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-primary);
  transition: opacity 0.2s ease;
}

.reporter-link:hover {
  opacity: 0.8;
}

.reporter-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--secondary-border-color);
}

.reporter-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-color-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
}

.reporter-name {
  font-weight: 500;
  color: var(--text-primary);
}

.report-metadata {
  display: flex;
  align-items: center;
  justify-content: right;
  gap: 8px;
  flex: 1;
}

.report-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hardware-badge,
.frame-rate-badge,
.tdp-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.hardware-badge {
  background: #f3f4f6;
  color: #374151;
}

.hardware-oled {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #78350f;
}

.hardware-lcd {
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
  color: #1e3a8a;
}

.frame-rate-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #064e3b;
}

.tdp-badge {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #92400e;
}

.posted-date {
  font-size: 0.75rem;
  color: var(--secondary-text-color);
}

.report-content {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 16px;
}

.notes {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.notes-text {
  margin-right: 1rem;
  word-break: break-word;
}

.see-more-text {
  font-size: 0.8rem;
  color: var(--primary-color);
  font-weight: 500;
  opacity: 0;
  text-wrap: nowrap;
  transition: opacity 0.2s ease;
}

.report-card:hover .see-more-text {
  opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .report-header {
    align-items: flex-start;
  }

  .report-header > div {
    flex: 1 1 100%;
  }

  .reporter-info {
    justify-content: space-between;
  }

  .report-metadata {
    justify-content: space-between;
    flex-direction: row-reverse;
  }

  .reporter-avatar,
  .reporter-avatar-placeholder {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 1024px) {
  .see-more-text {
    opacity: 1;
    display: block;
  }

  .notes-text {
    margin-right: 0;
  }
}
</style>
