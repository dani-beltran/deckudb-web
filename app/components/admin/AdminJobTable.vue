<template>
  <section class="job-table-card" aria-labelledby="jobs-table-title">
    <div class="table-toolbar">
      <div class="search-field">
        <label for="admin-job-search">Search jobs</label>
        <input
          id="admin-job-search"
          v-model="search"
          type="search"
          placeholder="Search by game name…"
        />
      </div>

      <div class="status-filter" aria-label="Filter jobs by status">
        <span class="filter-label">Status</span>
        <div class="filter-buttons">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            type="button"
            class="filter-button"
            :class="[`filter-${option.value}`, { active: filterStatus === option.value }]"
            :aria-pressed="filterStatus === option.value"
            @click="filterStatus = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <h2 id="jobs-table-title" class="visually-hidden">Jobs</h2>
    <div class="table-scroll" tabindex="0" aria-label="Jobs table, horizontally scrollable">
      <table class="job-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Type</th>
            <th scope="col">Game ID</th>
            <th scope="col">Game</th>
            <th scope="col">Status</th>
            <th scope="col">Started At</th>
            <th scope="col">Completed At</th>
            <th scope="col" :aria-sort="sortDirection === 'desc' ? 'descending' : 'ascending'">
              <button
                type="button"
                class="sort-button"
                :aria-label="`Sort by created date ${sortDirection === 'desc' ? 'ascending' : 'descending'}`"
                @click="toggleSort"
              >
                Created At
                <ArrowDown v-if="sortDirection === 'desc'" aria-hidden="true" />
                <ArrowUp v-else aria-hidden="true" />
              </button>
            </th>
            <th scope="col" class="actions-heading">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginatedJobs.length === 0">
            <td colspan="9" class="empty-row">No jobs match the current filters.</td>
          </tr>
          <tr
            v-for="job in paginatedJobs"
            v-else
            :key="job.job_id"
            class="job-row"
            :class="`status-${job.status}`"
          >
            <td class="monospace" :title="job.job_id">{{ shortId(job.job_id) }}</td>
            <td>
              <span class="type-badge" :class="`type-${job.job_type}`">
                {{ jobTypeLabel(job.job_type) }}
              </span>
            </td>
            <td class="monospace">{{ job.game_id }}</td>
            <td class="game-name">
              <a :href="`/game/${job.game_id}`" target="_blank" rel="noopener noreferrer">
                {{ job.game_name ?? '—' }}
              </a>
            </td>
            <td class="status-cell">
              <span class="status-badge" :class="job.status">{{ statusLabels[job.status] }}</span>
              <span v-if="job.status_message" class="status-tooltip">
                <button
                  type="button"
                  class="status-message-trigger"
                  :aria-label="`Status message: ${job.status_message}`"
                  :aria-describedby="statusMessageId(job.job_id)"
                >
                  <CircleAlert aria-hidden="true" />
                </button>
                <span :id="statusMessageId(job.job_id)" class="status-message" role="tooltip">
                  {{ job.status_message }}
                </span>
              </span>
            </td>
            <td class="date-cell">{{ formatDate(job.started_at) }}</td>
            <td class="date-cell">{{ formatDate(job.completed_at) }}</td>
            <td class="date-cell">{{ formatDate(job.created_at) }}</td>
            <td class="actions-cell">
              <button
                type="button"
                class="delete-button"
                :disabled="job.status === 'in_progress' || deletingJobIds.includes(job.job_id)"
                :title="
                  job.status === 'in_progress'
                    ? 'In-progress jobs cannot be deleted'
                    : `Delete ${job.game_name ?? 'job'}`
                "
                @click="confirmDelete(job)"
              >
                <Trash2 aria-hidden="true" />
                {{ deletingJobIds.includes(job.job_id) ? 'Deleting…' : 'Delete' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminPagination
      :current-page="safePage"
      :total-pages="totalPages"
      :page-size="pageSize"
      :total-items="filteredJobs.length"
      @page-change="goToPage"
      @page-size-change="changePageSize"
    />
  </section>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp, CircleAlert, Trash2 } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import type { Job, JobStatus, JobType } from '../../plugins/api/types'
import AdminPagination from './AdminPagination.vue'

type FilterStatus = JobStatus | 'all'
type SortDirection = 'asc' | 'desc'

const props = defineProps<{
  jobs: Job[]
  deletingJobIds: string[]
}>()

const emit = defineEmits<{ 'delete-job': [job: Job] }>()

const statusLabels: Record<JobStatus, string> = {
  queued: 'Queued',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
}

const filterOptions: Array<{ value: FilterStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

const jobTypeLabels: Record<JobType, string> = {
  search: 'Search',
  scrape: 'Scrape',
  reports: 'Reports',
  summary: 'Summary',
  full: 'Full',
}

const search = ref('')
const filterStatus = ref<FilterStatus>('all')
const sortDirection = ref<SortDirection>('desc')
const currentPage = ref(1)
const pageSize = ref(25)

const filteredJobs = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  const filtered = props.jobs.filter((job) => {
    if (filterStatus.value !== 'all' && job.status !== filterStatus.value) return false
    return !query || job.game_name?.toLocaleLowerCase().includes(query)
  })

  return [...filtered].sort((left, right) => {
    const difference = new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    return sortDirection.value === 'desc' ? -difference : difference
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredJobs.value.length / pageSize.value))
)
const safePage = computed(() => Math.min(currentPage.value, totalPages.value))
const paginatedJobs = computed(() => {
  const start = (safePage.value - 1) * pageSize.value
  return filteredJobs.value.slice(start, start + pageSize.value)
})

watch([search, filterStatus], () => {
  currentPage.value = 1
})

watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})

function toggleSort() {
  sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
  currentPage.value = 1
}

function goToPage(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

function changePageSize(size: number) {
  pageSize.value = size
  currentPage.value = 1
}

function shortId(id: string) {
  return id.split('-')[0]
}

function jobTypeLabel(type: JobType) {
  return jobTypeLabels[type]
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function statusMessageId(jobId: string) {
  return `status-message-${jobId}`
}

function confirmDelete(job: Job) {
  if (job.status === 'in_progress' || props.deletingJobIds.includes(job.job_id)) return
  const label = job.game_name ? `"${job.game_name}"` : `job ${shortId(job.job_id)}`
  if (window.confirm(`Delete ${jobTypeLabel(job.job_type).toLowerCase()} ${label}?`)) {
    emit('delete-job', job)
  }
}
</script>

<style scoped>
.job-table-card {
  padding: clamp(1rem, 2vw, 1.5rem);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.85rem;
  box-shadow: 0 4px 18px rgba(31, 42, 68, 0.06);
}

.table-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.search-field {
  display: grid;
  flex: 1 1 15rem;
  gap: 0.4rem;
  max-width: 28rem;
}

.search-field label,
.filter-label {
  color: var(--admin-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.search-field input {
  min-height: 2.4rem;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  color: var(--admin-text);
  background: #fff;
  border: 1px solid var(--admin-border);
  border-radius: 0.5rem;
  font: inherit;
  font-size: 0.875rem;
}

.search-field input:focus {
  border-color: var(--admin-primary);
  outline: 3px solid rgba(49, 84, 216, 0.14);
}

.status-filter {
  display: grid;
  gap: 0.4rem;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-button {
  min-height: 2.25rem;
  padding: 0.35rem 0.75rem;
  color: var(--admin-text);
  background: var(--admin-surface-muted);
  border: 1px solid var(--admin-border);
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 650;
}

.filter-button:hover:not(.active) {
  border-color: #98a5bd;
}

.filter-button:focus-visible,
.sort-button:focus-visible,
.delete-button:focus-visible,
.status-message-trigger:focus-visible,
.game-name a:focus-visible {
  outline: 3px solid rgba(49, 84, 216, 0.2);
  outline-offset: 2px;
}

.filter-button.active {
  color: #fff;
  background: var(--admin-primary);
  border-color: var(--admin-primary);
}

.filter-button.filter-queued.active {
  background: #b86605;
  border-color: #b86605;
}

.filter-button.filter-in_progress.active {
  background: #2563b8;
  border-color: #2563b8;
}

.filter-button.filter-completed.active {
  background: #087d5b;
  border-color: #087d5b;
}

.filter-button.filter-failed.active {
  background: #c82d3a;
  border-color: #c82d3a;
}

.table-scroll {
  overflow-x: auto;
  border: 1px solid #e6eaf1;
  border-radius: 0.55rem;
}

.table-scroll:focus-visible {
  outline: 3px solid rgba(49, 84, 216, 0.16);
  outline-offset: 2px;
}

.job-table {
  width: 100%;
  min-width: 74rem;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.job-table thead {
  background: var(--admin-surface-muted);
}

.job-table th {
  padding: 0.7rem 0.85rem;
  color: #43506a;
  border-bottom: 1px solid var(--admin-border);
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}

.job-table td {
  padding: 0.72rem 0.85rem;
  color: #344054;
  border-bottom: 1px solid #edf0f5;
  vertical-align: middle;
}

.job-table tbody tr:last-child td {
  border-bottom: 0;
}

.job-row {
  border-left: 3px solid transparent;
}

.job-row:hover {
  background: #fbfcfe;
}

.job-row.status-queued {
  border-left-color: #d98919;
}

.job-row.status-in_progress {
  border-left-color: #3478d4;
}

.job-row.status-completed {
  border-left-color: #119a71;
}

.job-row.status-failed {
  border-left-color: #d64552;
}

.monospace {
  color: #667085;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
}

.game-name {
  min-width: 10rem;
  max-width: 18rem;
}

.game-name a {
  color: #274da8;
  font-weight: 650;
  text-decoration: none;
}

.game-name a:hover {
  text-decoration: underline;
}

.type-badge,
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.type-badge {
  color: #43506a;
  background: #eef1f6;
}

.type-search {
  color: #9a3d12;
  background: #fff1e7;
}

.type-reports {
  color: #075f89;
  background: #e4f5fb;
}

.type-summary {
  color: #6332a1;
  background: #f0e9fb;
}

.type-full {
  color: #3247a3;
  background: #e8ecff;
}

.status-badge {
  min-width: 5.7rem;
}

.status-badge.queued {
  color: #86520a;
  background: #fff2cd;
}

.status-badge.in_progress {
  color: #174f9b;
  background: #e1efff;
}

.status-badge.completed {
  color: #076748;
  background: #d9f7eb;
}

.status-badge.failed {
  color: #a2202e;
  background: #ffe5e8;
}

.status-cell {
  position: relative;
  white-space: nowrap;
}

.status-tooltip {
  position: relative;
  display: inline-flex;
  margin-left: 0.35rem;
  vertical-align: middle;
}

.status-message-trigger {
  display: inline-grid;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  color: var(--admin-danger);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: help;
  place-items: center;
}

.status-message-trigger svg {
  width: 1rem;
  height: 1rem;
}

.status-message {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.5rem);
  z-index: 10;
  width: max-content;
  max-width: min(22rem, 70vw);
  padding: 0.55rem 0.7rem;
  color: #fff;
  background: #172033;
  border-radius: 0.4rem;
  box-shadow: 0 6px 18px rgba(23, 32, 51, 0.25);
  font-size: 0.75rem;
  line-height: 1.35;
  opacity: 0;
  overflow-wrap: anywhere;
  pointer-events: none;
  transform: translateY(0.2rem);
  transition: opacity 0.12s ease, transform 0.12s ease;
  white-space: normal;
}

.status-tooltip:hover .status-message,
.status-tooltip:focus-within .status-message {
  opacity: 1;
  transform: translateY(0);
}

.date-cell {
  color: #667085;
  font-size: 0.78rem;
  white-space: nowrap;
}

.actions-heading,
.actions-cell {
  text-align: right !important;
}

.delete-button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.85rem;
  padding: 0.3rem 0.55rem;
  color: #fff;
  background: var(--admin-danger);
  border: 0;
  border-radius: 0.4rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
}

.delete-button svg {
  width: 0.8rem;
  height: 0.8rem;
}

.delete-button:hover:not(:disabled) {
  background: var(--admin-danger-hover);
}

.delete-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.sort-button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  font: inherit;
  font-weight: inherit;
}

.sort-button svg {
  width: 0.9rem;
  height: 0.9rem;
  color: var(--admin-primary);
}

.empty-row {
  padding: 2rem !important;
  color: var(--admin-text-muted) !important;
  font-style: italic;
  text-align: center;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
