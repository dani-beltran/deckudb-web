<template>
  <Teleport to="#admin-overlay-root">
    <div v-if="message" class="dialog-backdrop" @mousedown.self="closeDialog">
      <section
        ref="dialogElement"
        class="status-message-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-message-dialog-title"
        aria-describedby="status-message-dialog-description"
        @keydown="handleDialogKeydown"
      >
        <header class="dialog-header">
          <div>
            <span class="dialog-eyebrow">Error message</span>
            <h2 id="status-message-dialog-title">Job issue</h2>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="close-button"
            aria-label="Close job issue"
            @click="closeDialog"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <p id="status-message-dialog-description" class="issue-message">{{ message }}</p>

        <footer class="dialog-footer">
          <button type="button" class="dialog-button" @click="closeDialog">Close</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ message: string | null }>()
const emit = defineEmits<{ close: [] }>()

const dialogElement = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

let previousBodyOverflow = ''
let bodyScrollLocked = false

watch(
  () => props.message,
  async (message) => {
    if (message && !bodyScrollLocked) {
      if (typeof document !== 'undefined') {
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        bodyScrollLocked = true
      }
      await nextTick()
      closeButton.value?.focus()
    } else {
      restoreBodyScroll()
    }
  }
)

onBeforeUnmount(restoreBodyScroll)

function closeDialog() {
  emit('close')
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
      'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
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

function restoreBodyScroll() {
  if (typeof document !== 'undefined' && bodyScrollLocked) {
    document.body.style.overflow = previousBodyOverflow
    bodyScrollLocked = false
  }
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
  animation: backdrop-in 0.16s ease-out;
  place-items: center;
}

.status-message-dialog {
  width: min(100%, 34rem);
  max-height: calc(100vh - 2rem);
  box-sizing: border-box;
  padding: 1.5rem;
  color: var(--admin-text);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.85rem;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
  animation: dialog-in 0.18s ease-out;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dialog-eyebrow {
  color: var(--admin-danger);
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dialog-header h2 {
  margin: 0.2rem 0 0;
  font-size: 1.35rem;
}

.close-button {
  display: inline-grid;
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
  padding: 0;
  color: var(--admin-text-muted);
  background: transparent;
  border: 0;
  border-radius: 0.35rem;
  cursor: pointer;
  place-items: center;
}

.close-button:hover {
  color: var(--admin-text);
  background: var(--admin-surface-muted);
}

.close-button svg {
  width: 1.15rem;
  height: 1.15rem;
}

.issue-message {
  max-height: min(50vh, 24rem);
  padding: 1rem;
  margin: 1.25rem 0 0;
  overflow-y: auto;
  color: #8f1d29;
  background: #fff4f5;
  border: 1px solid #fac8cd;
  border-radius: 0.55rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.25rem;
}

.dialog-button {
  min-height: 2.45rem;
  padding: 0.5rem 0.95rem;
  color: #fff;
  background: var(--admin-primary);
  border: 1px solid var(--admin-primary);
  border-radius: 0.45rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
}

.dialog-button:hover {
  background: var(--admin-primary-hover);
}

.close-button:focus-visible,
.dialog-button:focus-visible {
  outline: 3px solid rgba(49, 84, 216, 0.18);
  outline-offset: 2px;
}

@keyframes backdrop-in {
  from {
    opacity: 0;
  }
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(0.4rem) scale(0.98);
  }
}

@media (max-width: 500px) {
  .status-message-dialog {
    padding: 1.1rem;
  }

  .dialog-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dialog-backdrop,
  .status-message-dialog {
    animation: none;
  }
}
</style>
