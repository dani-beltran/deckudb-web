<template>
  <div class="pagination-footer">
    <p class="pagination-count">
      Showing {{ rangeStart }}–{{ rangeEnd }} of {{ totalItems }}
      {{ totalItems === 1 ? itemLabel : itemLabelPlural }}
    </p>

    <div class="pagination-controls">
      <button
        type="button"
        class="pagination-button"
        :disabled="currentPage === 1"
        aria-label="First page"
        @click="requestPage(1, $event)"
      >
        «
      </button>
      <button
        type="button"
        class="pagination-button"
        :disabled="currentPage === 1"
        aria-label="Previous page"
        @click="requestPage(currentPage - 1, $event)"
      >
        ‹
      </button>

      <span ref="pageInfo" class="page-info" tabindex="-1" aria-live="polite">
        Page {{ currentPage }} of {{ totalPages }}
      </span>

      <button
        type="button"
        class="pagination-button"
        :disabled="currentPage === totalPages"
        aria-label="Next page"
        @click="requestPage(currentPage + 1, $event)"
      >
        ›
      </button>
      <button
        type="button"
        class="pagination-button"
        :disabled="currentPage === totalPages"
        aria-label="Last page"
        @click="requestPage(totalPages, $event)"
      >
        »
      </button>

      <label class="page-size-label">
        <span class="visually-hidden">Rows per page</span>
        <select
          class="page-size-select"
          :value="pageSize"
          aria-label="Rows per page"
          @change="changePageSize"
        >
          <option v-for="option in pageSizeOptions" :key="option" :value="option">
            {{ option }} / page
          </option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    currentPage: number
    totalPages: number
    pageSize: number
    totalItems: number
    itemLabel?: string
    itemLabelPlural?: string
  }>(),
  {
    itemLabel: 'job',
    itemLabelPlural: 'jobs',
  }
)

const emit = defineEmits<{
  'page-change': [page: number]
  'page-size-change': [size: number]
}>()

const pageSizeOptions = [10, 25, 50, 100]
const pageInfo = ref<HTMLElement | null>(null)

let pageChangeTrigger: HTMLButtonElement | null = null

const rangeStart = computed(() =>
  props.totalItems === 0 ? 0 : (props.currentPage - 1) * props.pageSize + 1
)
const rangeEnd = computed(() => Math.min(props.currentPage * props.pageSize, props.totalItems))

function changePageSize(event: Event) {
  emit('page-size-change', Number((event.target as HTMLSelectElement).value))
}

function requestPage(page: number, event: MouseEvent) {
  pageChangeTrigger = event.currentTarget as HTMLButtonElement
  emit('page-change', page)
}

watch(
  () => props.currentPage,
  async () => {
    const trigger = pageChangeTrigger
    pageChangeTrigger = null
    if (!trigger) return

    await nextTick()
    if (!trigger.disabled && trigger.isConnected) trigger.focus()
    else pageInfo.value?.focus()
  }
)
</script>

<style scoped>
.pagination-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  margin-top: 1rem;
}

.pagination-count {
  margin: 0;
  color: var(--admin-text-muted);
  font-size: 0.8rem;
}

.pagination-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.pagination-button,
.page-size-select {
  min-width: 2rem;
  height: 2rem;
  box-sizing: border-box;
  color: var(--admin-text);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.4rem;
  font: inherit;
  font-size: 0.8rem;
}

.pagination-button {
  cursor: pointer;
}

.pagination-button:hover:not(:disabled),
.page-size-select:hover {
  border-color: #98a5bd;
  background: var(--admin-surface-muted);
}

.pagination-button:focus-visible,
.page-size-select:focus-visible,
.page-info:focus-visible {
  border-color: var(--admin-primary);
  outline: 3px solid rgba(49, 84, 216, 0.16);
  outline-offset: 2px;
}

.pagination-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.page-info {
  padding: 0 0.35rem;
  color: var(--admin-text-muted);
  font-size: 0.8rem;
  white-space: nowrap;
}

.page-size-select {
  min-width: 6.5rem;
  padding: 0 0.45rem;
  cursor: pointer;
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

@media (max-width: 600px) {
  .pagination-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
