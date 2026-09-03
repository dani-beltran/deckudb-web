<template>
  <div class="report-section">
    <div class="section-header">
      <h2 class="section-title">Community Game Reports</h2>
      <div class="filter-controls">
        <span class="filter-label">Filter by:</span>
        <button
          v-for="filter in reportFilters"
          :key="filter.value"
          type="button"
          :class="[
            'filter-button',
            `filter-button-${filter.value}`,
            { active: isFilterSelected(filter.value) },
          ]"
          :aria-pressed="isFilterSelected(filter.value)"
          @click="toggleFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
        <FilterDropdown
          v-model="selectedSource"
          :options="sourceOptions"
          all-label="All Sources"
        />
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

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Card from '../base/Card.vue'
import FilterDropdown from '../common/FilterDropdown.vue'
import GameReport from './GameReport.vue'
import type { GameReportData } from './types'

defineOptions({ name: 'GameReportsSection' })

type ReportFilter = 'performance' | 'battery_saving'

interface ReportFilterOption {
  label: string
  value: ReportFilter
}

const props = withDefaults(
  defineProps<{
    reports?: GameReportData[]
  }>(),
  {
    reports: () => [],
  }
)

const selectedFilters = ref<ReportFilter[]>([])
const selectedSource = ref<string | null>(null)
const reportFilters: ReportFilterOption[] = [
  { label: '60 FPS', value: 'performance' },
  { label: 'Low TDP', value: 'battery_saving' },
]

const SOURCE_LABELS: Record<string, string> = {
  other: 'Other',
  protondb: 'ProtonDB',
  reddit: 'Reddit',
  sharedeck: 'ShareDeck',
  youtube: 'YouTube',
}

const sourceOptions = computed(() =>
  Array.from(new Set(props.reports.map((report) => normalizeSource(report.source)).filter(Boolean)))
    .sort((firstSource, secondSource) =>
      formatSourceLabel(firstSource).localeCompare(formatSourceLabel(secondSource))
    )
    .map((source) => ({
      label: formatSourceLabel(source),
      value: source,
    }))
)

watch(sourceOptions, (options) => {
  if (
    selectedSource.value !== null &&
    !options.some((option) => option.value === selectedSource.value)
  ) {
    selectedSource.value = null
  }
})

const filteredReports = computed<GameReportData[]>(() => {
  let reports = props.reports

  if (selectedSource.value !== null) {
    reports = reports.filter((report) => normalizeSource(report.source) === selectedSource.value)
  }

  if (isFilterSelected('performance')) {
    reports = reports.filter((report) => {
      const fps =
        report.steamdeck_settings?.frame_rate_cap || report.steamdeck_experience?.average_frame_rate
      return fps ? Number.parseInt(String(fps), 10) >= 60 : false
    })
  }

  if (isFilterSelected('battery_saving')) {
    reports = reports.filter((report) => {
      const tdp = report.steamdeck_settings?.tdp_limit
      return tdp ? Number.parseInt(String(tdp), 10) < 10 : false
    })
  }

  return reports
})

function isFilterSelected(filter: ReportFilter): boolean {
  return selectedFilters.value.includes(filter)
}

function toggleFilter(filter: ReportFilter) {
  selectedFilters.value = isFilterSelected(filter)
    ? selectedFilters.value.filter((selectedFilter) => selectedFilter !== filter)
    : [...selectedFilters.value, filter]
}

function normalizeSource(source: string): string {
  return source.trim().toLowerCase()
}

function formatSourceLabel(source: string): string {
  return (
    SOURCE_LABELS[source] ??
    source
      .split(/[_-]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  )
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

.filter-button-performance.active,
.filter-button-performance:hover {
  /* +60FPS filter - green gradient */
  background: linear-gradient(135deg, #34d399, #10b981);
  color: #064e3b;
}

.filter-button-battery_saving.active,
.filter-button-battery_saving:hover {
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
    flex-wrap: wrap;
    justify-content: space-evenly;
  }

  .filter-label {
    display: none;
  }
}
</style>
