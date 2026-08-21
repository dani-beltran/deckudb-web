<template>
  <Teleport to="#admin-overlay-root">
    <div v-if="open" class="dialog-backdrop" @mousedown.self="closeDialog">
      <section
        ref="dialogElement"
        class="run-job-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-job-title"
        aria-describedby="run-job-description"
        @keydown="handleDialogKeydown"
      >
        <header class="dialog-header">
          <div>
            <h2 id="run-job-title">Run job</h2>
            <p id="run-job-description">Search for a Steam game and choose a job to queue.</p>
          </div>
          <button
            type="button"
            class="close-button"
            aria-label="Close run job dialog"
            :disabled="submitting"
            @click="closeDialog"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <form class="run-job-form" @submit.prevent="submitJob">
          <div class="form-field game-search-field">
            <label for="admin-game-search">Search game</label>
            <div class="search-input-wrap">
              <Search aria-hidden="true" class="search-icon" />
              <input
                id="admin-game-search"
                ref="searchInput"
                v-model="inputValue"
                type="text"
                role="combobox"
                autocomplete="off"
                aria-autocomplete="list"
                aria-controls="admin-game-search-results"
                :aria-expanded="showSuggestions"
                :aria-activedescendant="activeOptionId"
                placeholder="Type a game name…"
                :disabled="submitting"
                @focus="inputFocused = true"
                @blur="handleInputBlur"
                @keydown="handleSearchKeydown"
              />
              <button
                v-if="inputValue"
                type="button"
                class="clear-search"
                aria-label="Clear game search"
                :disabled="submitting"
                @mousedown.prevent
                @click="clearSearch"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div
              v-if="showSuggestions"
              id="admin-game-search-results"
              class="search-results"
              role="listbox"
              aria-label="Game search results"
            >
              <div v-if="loadingGames" class="search-state" aria-live="polite">
                <LoaderCircle class="spin" aria-hidden="true" />
                Searching…
              </div>
              <p v-else-if="searchError" class="search-state search-error" role="alert">
                {{ searchError }}
              </p>
              <ul v-else-if="games.length > 0">
                <li
                  v-for="(game, index) in games"
                  :id="gameOptionId(game.id)"
                  :key="game.id"
                  role="option"
                  :aria-selected="highlightedIndex === index"
                  :class="{ highlighted: highlightedIndex === index }"
                  @mouseenter="highlightedIndex = index"
                  @mousedown.prevent="selectGame(game)"
                  @click="selectGame(game)"
                >
                  <span>{{ game.name }}</span>
                  <span class="game-id">{{ game.id }}</span>
                </li>
              </ul>
              <p v-else class="search-state">No games found.</p>
            </div>
          </div>

          <div class="form-field">
            <label for="admin-job-type">Job type</label>
            <select id="admin-job-type" v-model="jobType" :disabled="submitting">
              <option v-for="option in jobTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <p v-if="error" class="form-error" role="alert">{{ error }}</p>

          <footer class="dialog-footer">
            <button
              type="button"
              class="dialog-button secondary"
              :disabled="submitting"
              @click="closeDialog"
            >
              Close
            </button>
            <button
              type="submit"
              class="dialog-button primary"
              :disabled="!selectedGame || submitting"
            >
              <LoaderCircle v-if="submitting" class="spin" aria-hidden="true" />
              {{ submitting ? 'Queueing…' : 'Run job' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { LoaderCircle, Search, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useNuxtApp } from '#imports'
import { getApiErrorMessage, isUnauthorizedError } from '../../plugins/api/errorHelpers'
import type { GameSearchResult, Job, JobType } from '../../plugins/api/types'

const { $adminApi } = useNuxtApp()
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  'job-queued': [job: Job]
  unauthorized: []
}>()

const jobTypeOptions: Array<{ value: JobType; label: string }> = [
  { value: 'search', label: 'Search sources' },
  { value: 'scrape', label: 'Scrape sources' },
  { value: 'reports', label: 'Generate reports' },
  { value: 'summary', label: 'Generate AI summary' },
  { value: 'full', label: 'Full process' },
]

const dialogElement = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const games = ref<GameSearchResult[]>([])
const selectedGame = ref<GameSearchResult | null>(null)
const inputValue = ref('')
const inputFocused = ref(false)
const highlightedIndex = ref(-1)
const loadingGames = ref(false)
const searchError = ref<string | null>(null)
const jobType = ref<JobType>('scrape')
const submitting = ref(false)
const error = ref<string | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let searchController: AbortController | undefined
let previousBodyOverflow = ''

const query = computed(() => inputValue.value.trim())
const hasSelectedInput = computed(() => selectedGame.value?.name === inputValue.value)
const showSuggestions = computed(
  () => inputFocused.value && Boolean(query.value) && !hasSelectedInput.value
)
const activeOptionId = computed(() => {
  const game = games.value[highlightedIndex.value]
  return game ? gameOptionId(game.id) : undefined
})

watch(inputValue, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  searchController?.abort()
  searchController = undefined
  highlightedIndex.value = -1
  searchError.value = null

  if (selectedGame.value?.name === value) return
  selectedGame.value = null
  games.value = []

  const term = value.trim()
  if (!term) {
    loadingGames.value = false
    return
  }

  loadingGames.value = true
  debounceTimer = setTimeout(() => void runSearch(term), 300)
})

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      resetForm()
      if (typeof document !== 'undefined') {
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      }
      await nextTick()
      searchInput.value?.focus()
    } else {
      restoreBodyScroll()
    }
  }
)

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  searchController?.abort()
  restoreBodyScroll()
})

async function runSearch(term: string) {
  searchController = new AbortController()
  const controller = searchController
  loadingGames.value = true

  try {
    const response = await $adminApi.searchGames(term, controller.signal)
    if (query.value === term) games.value = response.items ?? []
  } catch (searchFailure) {
    if (searchFailure instanceof Error && searchFailure.name === 'AbortError') return
    if (query.value === term) {
      games.value = []
      searchError.value = getApiErrorMessage(searchFailure, 'Unable to search games')
    }
  } finally {
    if (searchController === controller) {
      loadingGames.value = false
      searchController = undefined
    }
  }
}

function selectGame(game: GameSearchResult) {
  selectedGame.value = game
  inputValue.value = game.name
  inputFocused.value = false
  highlightedIndex.value = -1
  games.value = []
}

function clearSearch() {
  selectedGame.value = null
  inputValue.value = ''
  games.value = []
  searchError.value = null
  searchInput.value?.focus()
}

function handleInputBlur() {
  window.setTimeout(() => {
    inputFocused.value = false
  }, 100)
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    inputFocused.value = true
    if (games.value.length > 0) {
      highlightedIndex.value = (highlightedIndex.value + 1) % games.value.length
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (games.value.length > 0) {
      highlightedIndex.value =
        highlightedIndex.value <= 0 ? games.value.length - 1 : highlightedIndex.value - 1
    }
  } else if (event.key === 'Enter' && highlightedIndex.value >= 0) {
    event.preventDefault()
    const game = games.value[highlightedIndex.value]
    if (game) selectGame(game)
  } else if (event.key === 'Escape' && showSuggestions.value) {
    event.preventDefault()
    event.stopPropagation()
    inputFocused.value = false
  }
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDialog()
    return
  }

  if (event.key !== 'Tab' || !dialogElement.value) return
  const focusable = Array.from(
    dialogElement.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    )
  )
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

async function submitJob() {
  if (!selectedGame.value || submitting.value) return
  submitting.value = true
  error.value = null

  try {
    const job = await $adminApi.queueJob(selectedGame.value.id, jobType.value)
    emit('job-queued', job)
    emit('close')
  } catch (queueFailure) {
    if (isUnauthorizedError(queueFailure)) {
      emit('unauthorized')
      return
    }
    error.value = getApiErrorMessage(queueFailure, 'Failed to queue job')
  } finally {
    submitting.value = false
  }
}

function closeDialog() {
  if (!submitting.value) emit('close')
}

function resetForm() {
  if (debounceTimer) clearTimeout(debounceTimer)
  searchController?.abort()
  searchController = undefined
  games.value = []
  selectedGame.value = null
  inputValue.value = ''
  inputFocused.value = false
  highlightedIndex.value = -1
  loadingGames.value = false
  searchError.value = null
  jobType.value = 'scrape'
  submitting.value = false
  error.value = null
}

function restoreBodyScroll() {
  if (typeof document !== 'undefined') document.body.style.overflow = previousBodyOverflow
}

function gameOptionId(gameId: number) {
  return `admin-game-option-${gameId}`
}
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  padding: 1rem;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.58);
  place-items: center;
}

.run-job-dialog {
  width: min(100%, 32rem);
  max-height: calc(100vh - 2rem);
  box-sizing: border-box;
  padding: 1.5rem;
  color: var(--admin-text);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.85rem;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.35rem;
}

.dialog-header p {
  margin: 0.4rem 0 0;
  color: var(--admin-text-muted);
  font-size: 0.875rem;
  line-height: 1.45;
}

.close-button,
.clear-search {
  display: inline-grid;
  padding: 0;
  color: var(--admin-text-muted);
  background: transparent;
  border: 0;
  border-radius: 0.35rem;
  cursor: pointer;
  place-items: center;
}

.close-button {
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
}

.close-button svg {
  width: 1.15rem;
  height: 1.15rem;
}

.run-job-form {
  display: grid;
  gap: 1.1rem;
  margin-top: 1.4rem;
}

.form-field {
  display: grid;
  gap: 0.45rem;
}

.form-field label {
  font-size: 0.82rem;
  font-weight: 700;
}

.form-field input,
.form-field select {
  width: 100%;
  min-height: 2.65rem;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  color: var(--admin-text);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.5rem;
  font: inherit;
  font-size: 0.875rem;
}

.form-field input {
  padding-right: 2.4rem;
  padding-left: 2.3rem;
}

.form-field input:focus,
.form-field select:focus,
.close-button:focus-visible,
.clear-search:focus-visible,
.dialog-button:focus-visible {
  border-color: var(--admin-primary);
  outline: 3px solid rgba(49, 84, 216, 0.18);
  outline-offset: 1px;
}

.game-search-field {
  position: relative;
}

.search-input-wrap {
  position: relative;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  width: 1rem;
  height: 1rem;
  color: #8490a5;
  pointer-events: none;
  transform: translateY(-50%);
}

.clear-search {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  width: 1.7rem;
  height: 1.7rem;
  transform: translateY(-50%);
}

.clear-search svg {
  width: 0.95rem;
  height: 0.95rem;
}

.search-results {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  left: 0;
  z-index: 5;
  max-height: 15rem;
  overflow-y: auto;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.5rem;
  box-shadow: 0 10px 30px rgba(31, 42, 68, 0.16);
}

.search-results ul {
  padding: 0.3rem;
  margin: 0;
  list-style: none;
}

.search-results li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0.7rem;
  border-radius: 0.35rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.search-results li:hover,
.search-results li.highlighted {
  background: var(--admin-surface-muted);
}

.game-id {
  color: #8490a5;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
}

.search-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 3rem;
  padding: 0.6rem;
  margin: 0;
  color: var(--admin-text-muted);
  font-size: 0.82rem;
  text-align: center;
}

.search-error {
  color: #a2202e;
}

.search-state svg {
  width: 1rem;
  height: 1rem;
}

.form-error {
  margin: 0;
  padding: 0.7rem;
  color: #a2202e;
  background: #fff0f1;
  border: 1px solid #fac8cd;
  border-radius: 0.45rem;
  font-size: 0.82rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0.25rem;
}

.dialog-button {
  display: inline-flex;
  min-height: 2.45rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 0.45rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
}

.dialog-button.secondary {
  color: #344054;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
}

.dialog-button.primary {
  color: #fff;
  background: var(--admin-primary);
  border: 1px solid var(--admin-primary);
}

.dialog-button:hover:not(:disabled).secondary {
  background: var(--admin-surface-muted);
}

.dialog-button:hover:not(:disabled).primary {
  background: var(--admin-primary-hover);
}

.dialog-button:disabled,
.close-button:disabled,
.clear-search:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dialog-button svg {
  width: 1rem;
  height: 1rem;
}

.spin {
  animation: dialog-spin 0.8s linear infinite;
}

@keyframes dialog-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 500px) {
  .run-job-dialog {
    padding: 1.1rem;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-button {
    width: 100%;
  }
}
</style>
