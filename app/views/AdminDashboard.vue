<template>
  <section class="dashboard" aria-labelledby="dashboard-title">
    <header class="dashboard-header">
      <div>
        <span class="dashboard-eyebrow">DeckuDB backoffice</span>
        <h1 id="dashboard-title">Job dashboard</h1>
        <p>Monitor processing jobs and queue work for Steam games.</p>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="admin-button secondary icon-button"
          :disabled="refreshing || loading"
          aria-label="Refresh jobs"
          title="Refresh jobs"
          @click="loadJobs"
        >
          <RefreshCw :class="{ spin: refreshing }" aria-hidden="true" />
        </button>
        <button type="button" class="admin-button primary" @click="dialogOpen = true">
          <Play aria-hidden="true" />
          Run job
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

    <div v-if="loading" class="dashboard-state" role="status">
      <LoaderCircle class="spin" aria-hidden="true" />
      <span>Loading jobs…</span>
    </div>

    <div v-else-if="loadError && !loadedOnce" class="dashboard-state error-state" role="alert">
      <CircleAlert aria-hidden="true" />
      <div>
        <strong>Unable to load jobs</strong>
        <p>{{ loadError }}</p>
      </div>
      <button type="button" class="admin-button secondary" @click="loadJobs">Try again</button>
    </div>

    <template v-else>
      <div class="stats" aria-label="Job status totals">
        <article class="stat-card in-progress">
          <span class="stat-value">{{ statusCounts.in_progress }}</span>
          <span class="stat-label">In Progress</span>
        </article>
        <article class="stat-card queued">
          <span class="stat-value">{{ statusCounts.queued }}</span>
          <span class="stat-label">Queued</span>
        </article>
        <article class="stat-card completed">
          <span class="stat-value">{{ statusCounts.completed }}</span>
          <span class="stat-label">Completed</span>
        </article>
        <article class="stat-card failed">
          <span class="stat-value">{{ statusCounts.failed }}</span>
          <span class="stat-label">Failed</span>
        </article>
      </div>

      <p v-if="loadError" class="action-error" role="alert">
        Refresh failed: {{ loadError }}
      </p>
      <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>
      <span v-if="refreshing" class="visually-hidden" role="status">Refreshing jobs</span>

      <AdminJobTable
        :jobs="jobs"
        :deleting-job-ids="deletingJobIds"
        @delete-job="handleDeleteJob"
      />
    </template>

    <AdminRunJobDialog
      :open="dialogOpen"
      @close="dialogOpen = false"
      @job-queued="handleJobQueued"
      @unauthorized="handleUnauthorized"
    />
  </section>
</template>

<script setup lang="ts">
import { CircleAlert, LoaderCircle, LogOut, Play, RefreshCw } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { navigateTo, useNuxtApp } from '#imports'
import AdminJobTable from '../components/admin/AdminJobTable.vue'
import AdminRunJobDialog from '../components/admin/AdminRunJobDialog.vue'
import { getApiErrorMessage, isUnauthorizedError } from '../plugins/api/errorHelpers'
import type { Job, JobStatus } from '../plugins/api/types'

const { $adminApi } = useNuxtApp()
const jobs = ref<Job[]>([])
const loading = ref(true)
const refreshing = ref(false)
const loadedOnce = ref(false)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const deletingJobIds = ref<string[]>([])
const dialogOpen = ref(false)
const loggingOut = ref(false)

let loadController: AbortController | undefined

const statusCounts = computed<Record<JobStatus, number>>(() => {
  const counts: Record<JobStatus, number> = {
    queued: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
  }
  for (const job of jobs.value) counts[job.status] += 1
  return counts
})

onMounted(() => void loadJobs())
onBeforeUnmount(() => loadController?.abort())

async function loadJobs() {
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  loadError.value = null

  if (loadedOnce.value) refreshing.value = true
  else loading.value = true

  try {
    jobs.value = await $adminApi.fetchAllJobs(controller.signal)
    loadedOnce.value = true
  } catch (loadFailure) {
    if (loadFailure instanceof Error && loadFailure.name === 'AbortError') return
    if (isUnauthorizedError(loadFailure)) {
      await handleUnauthorized()
      return
    }
    loadError.value = getApiErrorMessage(loadFailure, 'Failed to load jobs')
  } finally {
    if (loadController === controller) {
      loading.value = false
      refreshing.value = false
    }
  }
}

async function handleDeleteJob(job: Job) {
  if (job.status === 'in_progress' || deletingJobIds.value.includes(job.job_id)) return
  actionError.value = null
  deletingJobIds.value = [...deletingJobIds.value, job.job_id]

  try {
    await $adminApi.deleteJob(job.job_id)
    jobs.value = jobs.value.filter((candidate) => candidate.job_id !== job.job_id)
  } catch (deleteFailure) {
    if (isUnauthorizedError(deleteFailure)) {
      await handleUnauthorized()
      return
    }
    actionError.value = getApiErrorMessage(deleteFailure, 'Failed to delete job')
  } finally {
    deletingJobIds.value = deletingJobIds.value.filter((jobId) => jobId !== job.job_id)
  }
}

function handleJobQueued() {
  dialogOpen.value = false
  void loadJobs()
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
  dialogOpen.value = false
  await navigateTo({ path: '/admin/login', query: { redirect: '/admin' } })
}
</script>

<style scoped>
.dashboard {
  width: min(100%, 92rem);
  box-sizing: border-box;
  padding: clamp(1rem, 3vw, 2rem);
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.dashboard-eyebrow {
  color: var(--admin-primary);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.dashboard-header h1 {
  margin: 0.25rem 0 0;
  color: var(--admin-text);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1.1;
}

.dashboard-header p {
  margin: 0.55rem 0 0;
  color: var(--admin-text-muted);
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.6rem;
}

.admin-button {
  display: inline-flex;
  min-height: 2.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
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

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
  margin-bottom: 1.25rem;
}

.stat-card {
  display: grid;
  min-height: 6rem;
  box-sizing: border-box;
  align-content: center;
  padding: 1rem 1.2rem;
  color: #fff;
  border-radius: 0.75rem;
  box-shadow: 0 7px 18px rgba(31, 42, 68, 0.1);
}

.stat-card.in-progress {
  background: linear-gradient(135deg, #3b82f6, #2452b9);
}

.stat-card.queued {
  background: linear-gradient(135deg, #e49a24, #b76005);
}

.stat-card.completed {
  background: linear-gradient(135deg, #13a97c, #087657);
}

.stat-card.failed {
  background: linear-gradient(135deg, #e2525e, #a91f2c);
}

.stat-value {
  font-size: 2rem;
  font-weight: 780;
  line-height: 1;
}

.stat-label {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  font-weight: 650;
  opacity: 0.92;
}

.dashboard-state {
  display: flex;
  width: min(100%, 34rem);
  min-height: 10rem;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  margin: 4rem auto;
  color: var(--admin-text-muted);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.85rem;
  box-shadow: 0 8px 24px rgba(31, 42, 68, 0.08);
}

.dashboard-state > svg {
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

.action-error {
  padding: 0.75rem 0.9rem;
  margin: 0 0 1rem;
  color: #9f1d2a;
  background: #fff0f1;
  border: 1px solid #fac8cd;
  border-radius: 0.55rem;
  font-size: 0.85rem;
}

.spin {
  animation: dashboard-spin 0.8s linear infinite;
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

@keyframes dashboard-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 800px) {
  .dashboard-header {
    flex-direction: column;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 460px) {
  .header-actions {
    width: 100%;
  }

  .header-actions .admin-button:not(.icon-button) {
    flex: 1;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .stat-card {
    min-height: 5rem;
  }

  .error-state {
    flex-wrap: wrap;
  }
}
</style>
