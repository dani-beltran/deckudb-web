<template>
  <div class="stats" aria-label="Job status totals">
    <article v-for="stat in stats" :key="stat.status" class="stat-card" :class="stat.className">
      <span class="stat-value">{{ counts[stat.status] }}</span>
      <span class="stat-label">{{ stat.label }}</span>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { JobStatus } from '../../plugins/api/types'

defineProps<{
  counts: Record<JobStatus, number>
}>()

const stats: Array<{ status: JobStatus; label: string; className: string }> = [
  { status: 'in_progress', label: 'In Progress', className: 'in-progress' },
  { status: 'queued', label: 'Queued', className: 'queued' },
  { status: 'completed', label: 'Completed', className: 'completed' },
  { status: 'failed', label: 'Failed', className: 'failed' },
]
</script>

<style scoped>
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

@media (max-width: 800px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 460px) {
  .stats {
    grid-template-columns: 1fr;
  }

  .stat-card {
    min-height: 5rem;
  }
}
</style>
