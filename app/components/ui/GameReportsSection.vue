<template>
  <div class="report-section">
    <div class="section-header">
      <h2 class="section-title">Community Game Reports</h2>
      <div class="filter-controls">
        <span class="filter-label">Filter by:</span>
        <button 
          v-for="filter in hardwareFilters" 
          :key="filter.value"
          :class="['filter-button', { active: selectedFilter === filter.value }]"
          @click="selectedFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>
    <Card>
      <div class="reports-container">
        <div v-if="filteredReports.length === 0" class="no-reports">
          <p>No reports to display.</p>
        </div>
        
        <GameReport 
          v-for="(report, index) in filteredReports" 
          :key="`${report.source}-${report.hash || index}`"
          :report="report"
        />
      </div>
    </Card>
  </div>
</template>

<script>
import Card from '../base/Card.vue'
import GameReport from './GameReport.vue'

export default {
  name: 'GameReportsSection',
  components: {
    Card,
    GameReport,
  },
  props: {
    reports: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      selectedFilter: 'all',
      hardwareFilters: [
        { label: 'All', value: 'all' },
        { label: 'LCD', value: 'lcd' },
        { label: 'OLED', value: 'oled' },
        { label: '60 FPS', value: 'performance' },
        { label: 'Low TDP', value: 'battery_saving' },
      ],
    }
  },
  computed: {
    filteredReports() {
      if (this.selectedFilter === 'all') {
        return this.reports
      }
      if (this.selectedFilter === 'performance') {
        return this.reports.filter((report) => {
          const fps =
            report.steamdeck_settings?.frame_rate_cap ||
            report.steamdeck_experience?.average_frame_rate
          return fps && parseInt(fps, 10) >= 60
        })
      }
      if (this.selectedFilter === 'battery_saving') {
        return this.reports.filter((report) => {
          const tdp = report.steamdeck_settings?.tdp_limit
          return tdp && parseInt(tdp, 10) < 10
        })
      }
      return this.reports.filter(
        (report) =>
          report.steamdeck_hardware &&
          report.steamdeck_hardware.toLowerCase() === this.selectedFilter
      )
    },
  },
}
</script>

<style scoped>
.section-header {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-right: 4px;
  color: var(--text-secondary);
}

.filter-button {
  padding: 6px 16px;
  border-radius: 20px;
  border: 0px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.filter-button:hover {
  background: var(--primary-color);
  color: white;
}

.filter-button.active {
  background: var(--primary-color);
  color: white;
}

.filter-button:nth-child(3).active,.filter-button:nth-child(3):hover {
  /* LCD filter - blue gradient matching hardware badge */
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
  color: #1e3a8a;
}


.filter-button:nth-child(4).active,.filter-button:nth-child(4):hover {
  /* OLED filter - orange gradient matching hardware badge */
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #78350f;
}

.filter-button:nth-child(5).active,.filter-button:nth-child(5):hover {
  /* +60FPS filter - green gradient */
  background: linear-gradient(135deg, #34d399, #10b981);
  color: #064e3b;
}

.filter-button:nth-child(6).active,.filter-button:nth-child(6):hover {
  /* Low TDP filter - orange gradient */
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #92400e;
}

.reports-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.report-section {
  margin-bottom: 20px;
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--secondary-text-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.no-reports {
  text-align: center;
  padding: 40px 20px;
  color: var(--secondary-text-color);
}

.no-reports p {
  margin: 0;
  font-size: 0.875rem;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-controls {
    width: 100%;
    justify-content: space-evenly;
  }

  .filter-label {
    display: none;
  }
}
</style>
