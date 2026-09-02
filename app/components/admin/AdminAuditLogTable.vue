<template>
  <section class="audit-table-card" aria-labelledby="audit-table-title">
    <div class="table-heading">
      <div>
        <h2 id="audit-table-title">Activity</h2>
        <p>Newest entries appear first.</p>
      </div>
      <span class="result-total">{{ totalItems }} {{ totalItems === 1 ? 'entry' : 'entries' }}</span>
    </div>

    <div class="table-scroll" tabindex="0" aria-label="Audit log table, horizontally scrollable">
      <table class="audit-table">
        <thead>
          <tr>
            <th scope="col">Timestamp</th>
            <th scope="col">User</th>
            <th scope="col">Action</th>
            <th scope="col">Target</th>
            <th scope="col">Outcome</th>
            <th scope="col">Context</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="entries.length === 0">
            <td colspan="6" class="empty-row">
              <FileSearch aria-hidden="true" />
              <strong>No audit log entries found</strong>
              <span>Try clearing or changing the current filters.</span>
            </td>
          </tr>
          <tr v-for="entry in entries" v-else :key="entry.audit_id" class="audit-row">
            <td class="date-cell">
              <time :datetime="entry.created_at" :title="formatExactDate(entry.created_at)">
                {{ formatDate(entry.created_at) }}
              </time>
            </td>
            <td class="user-cell">{{ entry.user_identity }}</td>
            <td>
              <span class="action-badge" :class="`action-${entry.action_type}`">
                {{ actionLabels[entry.action_type] }}
              </span>
            </td>
            <td>
              <div v-if="entry.target_resource || entry.target_id" class="target-cell">
                <span v-if="entry.target_resource" class="target-type">
                  {{ resourceLabel(entry.target_resource) }}
                </span>
                <code v-if="entry.target_id" :title="entry.target_id">{{ entry.target_id }}</code>
              </div>
              <span v-else aria-label="No target">—</span>
            </td>
            <td>
              <span class="outcome-badge" :class="entry.outcome">
                <CircleCheck v-if="entry.outcome === 'success'" aria-hidden="true" />
                <CircleX v-else aria-hidden="true" />
                {{ outcomeLabels[entry.outcome] }}
              </span>
            </td>
            <td class="context-cell">
              <dl v-if="contextItems(entry.context).length > 0" class="context-list">
                <div v-for="item in contextItems(entry.context)" :key="item.label">
                  <dt>{{ item.label }}</dt>
                  <dd>{{ item.value }}</dd>
                </div>
              </dl>
              <span v-else aria-label="No additional context">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminPagination
      :current-page="currentPage"
      :total-pages="totalPages"
      :page-size="pageSize"
      :total-items="totalItems"
      item-label="entry"
      item-label-plural="entries"
      @page-change="$emit('page-change', $event)"
      @page-size-change="$emit('page-size-change', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import { CircleCheck, CircleX, FileSearch } from 'lucide-vue-next'
import type {
  AuditActionType,
  AuditLogContext,
  AuditLogEntry,
  AuditOutcome,
  JobType,
} from '../../plugins/api/types'
import AdminPagination from './AdminPagination.vue'

defineProps<{
  entries: AuditLogEntry[]
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
}>()

defineEmits<{
  'page-change': [page: number]
  'page-size-change': [size: number]
}>()

const actionLabels: Record<AuditActionType, string> = {
  login: 'Login',
  logout: 'Logout',
  job_run: 'Run job',
  job_delete: 'Delete job',
}

const outcomeLabels: Record<AuditOutcome, string> = {
  success: 'Success',
  failure: 'Failure',
}

const jobTypeLabels: Record<JobType, string> = {
  search: 'Search',
  scrape: 'Scrape',
  reports: 'Reports',
  summary: 'Summary',
  full: 'Full',
}

function contextItems(context: AuditLogContext | null | undefined) {
  if (!context) return []

  const items: Array<{ label: string; value: string }> = []
  if (typeof context.game_name === 'string' && context.game_name) {
    items.push({ label: 'Game', value: context.game_name })
  }
  if (typeof context.game_id === 'number') {
    items.push({ label: 'Game ID', value: String(context.game_id) })
  }
  if (context.job_type && context.job_type in jobTypeLabels) {
    items.push({ label: 'Job type', value: jobTypeLabels[context.job_type] })
  }
  if (typeof context.reason === 'string' && context.reason) {
    items.push({ label: 'Reason', value: humanizeReason(context.reason) })
  }
  if (typeof context.status_code === 'number') {
    items.push({ label: 'HTTP status', value: String(context.status_code) })
  }

  return items
}

function humanizeReason(reason: string) {
  const label = reason.replaceAll('_', ' ')
  return label.charAt(0).toLocaleUpperCase() + label.slice(1)
}

function resourceLabel(resource: AuditLogEntry['target_resource']) {
  return resource === 'job' ? 'Job' : resource
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatExactDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}
</script>

<style scoped>
.audit-table-card {
  padding: clamp(1rem, 2vw, 1.5rem);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.85rem;
  box-shadow: 0 4px 18px rgba(31, 42, 68, 0.06);
}

.table-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.table-heading h2 {
  margin: 0;
  color: var(--admin-text);
  font-size: 1rem;
}

.table-heading p {
  margin: 0.25rem 0 0;
  color: var(--admin-text-muted);
  font-size: 0.8rem;
}

.result-total {
  flex: none;
  padding: 0.3rem 0.55rem;
  color: var(--admin-text-muted);
  background: var(--admin-surface-muted);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
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

.audit-table {
  width: 100%;
  min-width: 66rem;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.audit-table thead {
  background: var(--admin-surface-muted);
}

.audit-table th {
  padding: 0.7rem 0.85rem;
  color: #43506a;
  border-bottom: 1px solid var(--admin-border);
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}

.audit-table td {
  max-width: 22rem;
  padding: 0.8rem 0.85rem;
  color: var(--admin-text);
  border-bottom: 1px solid #edf0f5;
  text-align: left;
  vertical-align: top;
}

.audit-row:last-child td {
  border-bottom: 0;
}

.audit-row:hover {
  background: #fafbfe;
}

.date-cell,
.user-cell {
  white-space: nowrap;
}

.user-cell {
  font-weight: 650;
}

.action-badge,
.outcome-badge,
.target-type {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.action-badge {
  color: #3154a6;
  background: #edf2ff;
}

.action-job_run {
  color: #1f5a8d;
  background: #e8f4ff;
}

.action-job_delete {
  color: #8e2530;
  background: #fff0f1;
}

.action-logout {
  color: #6847a1;
  background: #f3effb;
}

.outcome-badge svg {
  width: 0.85rem;
  height: 0.85rem;
}

.outcome-badge.success {
  color: #087657;
  background: #e8f8f2;
}

.outcome-badge.failure {
  color: #a9232e;
  background: #fff0f1;
}

.target-cell {
  display: grid;
  justify-items: start;
  gap: 0.35rem;
}

.target-type {
  color: #43506a;
  background: #eef1f6;
}

.target-cell code {
  max-width: 16rem;
  overflow-wrap: anywhere;
  color: #4c5870;
  font-size: 0.75rem;
}

.context-list {
  display: grid;
  gap: 0.35rem;
  margin: 0;
}

.context-list div {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 0.35rem;
}

.context-list dt {
  color: var(--admin-text-muted);
  font-weight: 700;
}

.context-list dt::after {
  content: ":";
}

.context-list dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.empty-row {
  height: 12rem;
  text-align: center !important;
  vertical-align: middle !important;
}

.empty-row svg {
  display: block;
  width: 1.5rem;
  height: 1.5rem;
  margin: 0 auto 0.55rem;
  color: var(--admin-text-muted);
}

.empty-row strong,
.empty-row span {
  display: block;
}

.empty-row span {
  margin-top: 0.3rem;
  color: var(--admin-text-muted);
  font-size: 0.78rem;
  font-weight: 400;
}

@media (max-width: 600px) {
  .table-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
