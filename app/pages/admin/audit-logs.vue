<template>
  <section class="audit-page" aria-labelledby="audit-page-title">
    <header class="page-header">
      <div>
        <span class="page-eyebrow">DeckuDB backoffice</span>
        <h1 id="audit-page-title">Audit logs</h1>
        <p>Review dashboard sign-ins, job activity, and their outcomes.</p>
      </div>

      <div class="header-actions">
        <NuxtLink class="admin-button secondary" to="/admin">
          <LayoutDashboard aria-hidden="true" />
          Job dashboard
        </NuxtLink>
        <button
          type="button"
          class="admin-button secondary icon-button"
          :disabled="loading"
          aria-label="Refresh audit logs"
          title="Refresh audit logs"
          @click="loadAuditLogs(currentPage)"
        >
          <RefreshCw :class="{ spin: loading && loadedOnce }" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="admin-button secondary"
          :disabled="loggingOut"
          @click="handleLogout"
        >
          <LogOut aria-hidden="true" />
          {{ loggingOut ? 'Signing out…' : 'Log out' }}
        </button>
      </div>
    </header>

    <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>

    <form class="filter-card" aria-labelledby="filter-title" @submit.prevent="applyFilters">
      <div class="filter-heading">
        <div>
          <h2 id="filter-title">Filters</h2>
          <p>Narrow entries by actor, activity, or UTC date range.</p>
        </div>
        <span v-if="hasActiveFilters" class="active-filter-indicator">Filters active</span>
      </div>

      <div class="filter-grid">
        <label class="filter-field">
          <span>User</span>
          <input
            v-model="draftFilters.userIdentity"
            type="search"
            autocomplete="off"
            placeholder="Exact user identity"
            :disabled="loading"
          />
        </label>

        <label class="filter-field">
          <span>Action</span>
          <select v-model="draftFilters.actionType" :disabled="loading">
            <option value="">All actions</option>
            <option v-for="option in actionOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="filter-field">
          <span>From date</span>
          <input
            v-model="draftFilters.dateFrom"
            type="date"
            :max="draftFilters.dateTo || undefined"
            :disabled="loading"
            aria-describedby="audit-date-help"
          />
        </label>

        <label class="filter-field">
          <span>To date</span>
          <input
            v-model="draftFilters.dateTo"
            type="date"
            :min="draftFilters.dateFrom || undefined"
            :disabled="loading"
            aria-describedby="audit-date-help"
          />
        </label>
      </div>

      <p id="audit-date-help" class="filter-help">
        Date boundaries are inclusive and interpreted in UTC.
      </p>
      <p v-if="filterError" class="filter-error" role="alert">{{ filterError }}</p>

      <div class="filter-actions">
        <button type="submit" class="admin-button primary" :disabled="loading">
          <ListFilter aria-hidden="true" />
          Apply filters
        </button>
        <button
          type="button"
          class="admin-button secondary"
          :disabled="loading || !hasAnyFilterValues"
          @click="clearFilters"
        >
          <X aria-hidden="true" />
          Clear
        </button>
      </div>
    </form>

    <div v-if="loading && !loadedOnce" class="page-state" role="status" aria-live="polite">
      <LoaderCircle class="spin" aria-hidden="true" />
      <span>Loading audit logs…</span>
    </div>

    <div v-else-if="loadError && !loadedOnce" class="page-state error-state" role="alert">
      <CircleAlert aria-hidden="true" />
      <div>
        <strong>Unable to load audit logs</strong>
        <p>{{ loadError }}</p>
      </div>
      <button type="button" class="admin-button secondary" @click="loadAuditLogs(currentPage)">
        Try again
      </button>
    </div>

    <template v-else>
      <p v-if="loading" class="update-state" role="status" aria-live="polite">
        <LoaderCircle class="spin" aria-hidden="true" />
        Updating audit logs…
      </p>
      <div v-if="loadError" class="inline-error" role="alert">
        <CircleAlert aria-hidden="true" />
        <span>{{ loadError }}</span>
        <button type="button" class="admin-button secondary" @click="loadAuditLogs(currentPage)">
          Try again
        </button>
      </div>
      <div class="table-region" :aria-busy="loading">
        <AdminAuditLogTable
          :entries="auditLogs.items"
          :current-page="currentPage"
          :total-pages="totalPages"
          :page-size="pageSize"
          :total-items="auditLogs.total"
          @page-change="changePage"
          @page-size-change="changePageSize"
        />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  CircleAlert,
  LayoutDashboard,
  ListFilter,
  LoaderCircle,
  LogOut,
  RefreshCw,
  X,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { definePageMeta, navigateTo, useHead, useNuxtApp } from '#imports'
import AdminAuditLogTable from '../../components/admin/AdminAuditLogTable.vue'
import { getApiErrorMessage, isUnauthorizedError } from '../../plugins/api/errorHelpers'
import type {
  AuditActionType,
  AuditLogEntry,
  AuditLogQuery,
  PaginatedResult,
} from '../../plugins/api/types'

definePageMeta({ layout: 'admin', name: 'AdminAuditLogs' })
useHead({
  title: 'Audit Logs - DeckuDB',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

type FilterValues = {
  userIdentity: string
  actionType: AuditActionType | ''
  dateFrom: string
  dateTo: string
}

const emptyFilters = (): FilterValues => ({
  userIdentity: '',
  actionType: '',
  dateFrom: '',
  dateTo: '',
})

const actionOptions: Array<{ value: AuditActionType; label: string }> = [
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'job_run', label: 'Run job' },
  { value: 'job_delete', label: 'Delete job' },
]

const { $adminApi } = useNuxtApp()
const draftFilters = reactive<FilterValues>(emptyFilters())
const appliedFilters = ref<FilterValues>(emptyFilters())
const auditLogs = ref<PaginatedResult<AuditLogEntry>>({
  items: [],
  total: 0,
  page: 1,
  page_size: 25,
  total_pages: 0,
})
const currentPage = ref(1)
const pageSize = ref(25)
const loading = ref(true)
const loadedOnce = ref(false)
const loggingOut = ref(false)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const filterError = ref<string | null>(null)

let loadController: AbortController | undefined

const totalPages = computed(() => Math.max(1, auditLogs.value.total_pages))
const hasActiveFilters = computed(() => hasFilterValue(appliedFilters.value))
const hasAnyFilterValues = computed(
  () => hasFilterValue(draftFilters) || hasFilterValue(appliedFilters.value)
)

onMounted(() => void loadAuditLogs(1))
onBeforeUnmount(() => loadController?.abort())

async function loadAuditLogs(page: number) {
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  loading.value = true
  loadError.value = null

  const filters = appliedFilters.value
  const query: AuditLogQuery = {
    page,
    page_size: pageSize.value,
    ...(filters.userIdentity ? { user_identity: filters.userIdentity } : {}),
    ...(filters.actionType ? { action_type: filters.actionType } : {}),
    ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
    ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
  }

  try {
    const response = await $adminApi.fetchAuditLogs(query, controller.signal)
    if (loadController !== controller) return
    auditLogs.value = response
    currentPage.value = response.page
    loadedOnce.value = true
  } catch (loadFailure) {
    if (loadFailure instanceof Error && loadFailure.name === 'AbortError') return
    if (isUnauthorizedError(loadFailure)) {
      await handleUnauthorized()
      return
    }
    loadError.value = getApiErrorMessage(loadFailure, 'Failed to load audit logs')
  } finally {
    if (loadController === controller) loading.value = false
  }
}

function applyFilters() {
  filterError.value = null
  if (draftFilters.dateFrom && draftFilters.dateTo && draftFilters.dateFrom > draftFilters.dateTo) {
    filterError.value = 'The start date must be on or before the end date.'
    return
  }

  appliedFilters.value = {
    userIdentity: draftFilters.userIdentity.trim(),
    actionType: draftFilters.actionType,
    dateFrom: draftFilters.dateFrom,
    dateTo: draftFilters.dateTo,
  }
  void loadAuditLogs(1)
}

function clearFilters() {
  Object.assign(draftFilters, emptyFilters())
  appliedFilters.value = emptyFilters()
  filterError.value = null
  void loadAuditLogs(1)
}

function changePage(page: number) {
  if (loading.value || page === currentPage.value) return
  void loadAuditLogs(Math.max(1, Math.min(page, totalPages.value)))
}

function changePageSize(size: number) {
  if (loading.value || size === pageSize.value) return
  pageSize.value = size
  void loadAuditLogs(1)
}

function hasFilterValue(filters: FilterValues) {
  return Boolean(filters.userIdentity || filters.actionType || filters.dateFrom || filters.dateTo)
}

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  actionError.value = null

  try {
    await $adminApi.logoutAdmin()
    await navigateTo('/admin/login')
  } catch (logoutFailure) {
    if (isUnauthorizedError(logoutFailure)) {
      await handleUnauthorized()
      return
    }
    actionError.value = getApiErrorMessage(logoutFailure, 'Failed to log out')
  } finally {
    loggingOut.value = false
  }
}

async function handleUnauthorized() {
  await navigateTo({ path: '/admin/login', query: { redirect: '/admin/audit-logs' } })
}
</script>

<style scoped>
.audit-page {
  width: min(100%, 92rem);
  box-sizing: border-box;
  padding: clamp(1rem, 3vw, 2rem);
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.page-eyebrow {
  color: var(--admin-primary);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0.25rem 0 0;
  color: var(--admin-text);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1.1;
}

.page-header p {
  margin: 0.55rem 0 0;
  color: var(--admin-text-muted);
  font-size: 0.9rem;
}

.header-actions,
.filter-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.6rem;
}

.admin-button {
  display: inline-flex;
  min-height: 2.35rem;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}

.admin-button svg {
  width: 1rem;
  height: 1rem;
}

.admin-button.primary {
  color: #fff;
  background: var(--admin-primary);
  border: 1px solid var(--admin-primary);
}

.admin-button.primary:hover:not(:disabled) {
  background: var(--admin-primary-hover);
}

.admin-button.secondary {
  color: var(--admin-text);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
}

.admin-button.secondary:hover:not(:disabled) {
  background: var(--admin-surface-muted);
  border-color: #98a5bd;
}

.admin-button:focus-visible {
  outline: 3px solid rgba(49, 84, 216, 0.2);
  outline-offset: 2px;
}

.admin-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.icon-button {
  width: 2.35rem;
  padding: 0;
}

.filter-card {
  padding: clamp(1rem, 2vw, 1.35rem);
  margin-bottom: 1.25rem;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.85rem;
  box-shadow: 0 4px 18px rgba(31, 42, 68, 0.06);
}

.action-error {
  padding: 0.75rem 0.9rem;
  margin: 0 0 1rem;
  color: #9f1d2a;
  background: #fff0f1;
  border: 1px solid #fac8cd;
  border-radius: 0.55rem;
  font-size: 0.85rem;
}

.filter-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-heading h2 {
  margin: 0;
  color: var(--admin-text);
  font-size: 1rem;
}

.filter-heading p {
  margin: 0.25rem 0 0;
  color: var(--admin-text-muted);
  font-size: 0.8rem;
}

.active-filter-indicator {
  padding: 0.3rem 0.55rem;
  color: #3154a6;
  background: #edf2ff;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(12rem, 1.4fr) minmax(10rem, 1fr) repeat(2, minmax(9rem, 1fr));
  gap: 0.85rem;
}

.filter-field {
  display: grid;
  gap: 0.4rem;
}

.filter-field > span {
  color: var(--admin-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.filter-field input,
.filter-field select {
  width: 100%;
  min-height: 2.4rem;
  box-sizing: border-box;
  padding: 0.5rem 0.7rem;
  color: var(--admin-text);
  background: #fff;
  border: 1px solid var(--admin-border);
  border-radius: 0.5rem;
  font: inherit;
  font-size: 0.85rem;
}

.filter-field input:focus,
.filter-field select:focus {
  border-color: var(--admin-primary);
  outline: 3px solid rgba(49, 84, 216, 0.14);
}

.filter-field input:disabled,
.filter-field select:disabled {
  opacity: 0.65;
}

.filter-help {
  margin: 0.65rem 0 0;
  color: var(--admin-text-muted);
  font-size: 0.75rem;
}

.filter-error {
  padding: 0.65rem 0.75rem;
  margin: 0.75rem 0 0;
  color: #9f1d2a;
  background: #fff0f1;
  border: 1px solid #fac8cd;
  border-radius: 0.5rem;
  font-size: 0.8rem;
}

.filter-actions {
  justify-content: flex-start;
  margin-top: 1rem;
}

.page-state {
  display: flex;
  width: min(100%, 34rem);
  min-height: 10rem;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  margin: 3rem auto;
  color: var(--admin-text-muted);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.85rem;
  box-shadow: 0 8px 24px rgba(31, 42, 68, 0.08);
}

.page-state > svg {
  width: 1.4rem;
  height: 1.4rem;
}

.error-state {
  align-items: flex-start;
  justify-content: flex-start;
  color: #9f1d2a;
}

.error-state div {
  flex: 1;
}

.error-state p {
  margin: 0.3rem 0 0;
  color: var(--admin-text-muted);
  font-size: 0.85rem;
}

.update-state,
.inline-error {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.65rem 0.8rem;
  margin: 0 0 1rem;
  border-radius: 0.55rem;
  font-size: 0.82rem;
}

.update-state {
  color: var(--admin-text-muted);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
}

.inline-error {
  color: #9f1d2a;
  background: #fff0f1;
  border: 1px solid #fac8cd;
}

.inline-error span {
  flex: 1;
}

.update-state svg,
.inline-error > svg {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.table-region {
  transition: opacity 0.15s ease;
}

.table-region[aria-busy="true"] {
  opacity: 0.65;
}

.spin {
  animation: audit-spin 0.8s linear infinite;
}

@keyframes audit-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 560px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .header-actions,
  .filter-actions {
    width: 100%;
  }

  .header-actions .admin-button:not(.icon-button),
  .filter-actions .admin-button {
    flex: 1;
  }

  .filter-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .error-state {
    flex-wrap: wrap;
  }
}
</style>
