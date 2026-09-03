<template>
  <div class="support-chat-root">
    <Transition name="support-chat-launcher">
      <button
        v-if="!isOpen"
        ref="launcherButton"
        class="support-chat-launcher"
        type="button"
        aria-label="Open support chat"
        @click="openChat"
      >
        <span class="support-chat-bubble">Hello there! Ask me about any game.</span>
        <span class="support-chat-avatar support-chat-avatar--launcher" aria-hidden="true">
          <img src="../../assets/decku-logo.png" alt="" />
        </span>
      </button>
    </Transition>

    <Transition name="support-chat-panel">
      <section
        v-if="isOpen"
        class="support-chat-panel"
        role="dialog"
        aria-labelledby="support-chat-title"
        aria-describedby="support-chat-description"
      >
        <header class="support-chat-header">
          <span class="support-chat-avatar" aria-hidden="true">
            <img src="../../assets/decku-logo.png" alt="" />
          </span>
          <div class="support-chat-heading">
            <h2 id="support-chat-title">DeckuBot support chat</h2>
            <p id="support-chat-description">Ask me about any game</p>
          </div>
          <button
            class="support-chat-close"
            type="button"
            aria-label="Close support chat"
            @click="closeChat"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div
          ref="transcript"
          class="support-chat-transcript"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
        >
          <div
            v-for="message in messages"
            :key="message.id"
            :class="['support-chat-message-row', `support-chat-message-row--${message.role}`]"
          >
            <span class="visually-hidden">
              {{ message.role === 'assistant' ? 'DeckuBot' : 'You' }}:
            </span>
            <p :class="['support-chat-message', `support-chat-message--${message.role}`]">
              <template v-for="(part, index) in message.parts" :key="index">
                <span v-if="part.type === 'text'">{{ part.text }}</span>
              </template>
            </p>
          </div>

          <div
            v-if="isAwaitingResponse"
            class="support-chat-message-row support-chat-message-row--assistant"
          >
            <div class="support-chat-message support-chat-message--assistant support-chat-thinking">
              <span class="visually-hidden">DeckuBot is thinking</span>
              <span class="support-chat-thinking-dot" aria-hidden="true" />
              <span class="support-chat-thinking-dot" aria-hidden="true" />
              <span class="support-chat-thinking-dot" aria-hidden="true" />
            </div>
          </div>

          <div v-if="errorMessage" class="support-chat-error" role="alert">
            <p>{{ errorMessage }}</p>
            <button type="button" :disabled="isLoading" @click="retryLastMessage">
              <RotateCcw aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>

        <form class="support-chat-form" @submit.prevent="sendMessage">
          <label class="visually-hidden" for="support-chat-input">Message DeckuBot</label>
          <textarea
            id="support-chat-input"
            ref="messageInput"
            v-model="draft"
            rows="1"
            maxlength="2000"
            placeholder="Ask about a game..."
            :disabled="isLoading"
            @keydown="handleInputKeydown"
          />
          <button
            class="support-chat-send"
            type="submit"
            aria-label="Send message"
            :disabled="!canSend"
          >
            <SendHorizontal aria-hidden="true" />
          </button>
        </form>
        <p class="support-chat-hint">Enter to send · Shift+Enter for a new line</p>
      </section>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useChat } from '@ai-sdk/vue'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { RotateCcw, SendHorizontal, X } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

defineOptions({ name: 'SupportChat' })

const ASSISTANT_GREETING = 'Hi! I’m DeckuBot. Ask me about any game or how it runs on Steam Deck.'
const SEND_ERROR_MESSAGE = 'I couldn’t send that message. Please try again.'

const isOpen = ref(false)
const draft = ref('')
const launcherButton = ref<HTMLButtonElement | null>(null)
const messageInput = ref<HTMLTextAreaElement | null>(null)
const transcript = ref<HTMLElement | null>(null)

const {
  messages,
  status,
  error,
  sendMessage: sendChatMessage,
  regenerate,
  clearError,
} = useChat<UIMessage>({
  messages: [
    {
      id: 'deckubot-greeting',
      role: 'assistant',
      parts: [{ type: 'text', text: ASSISTANT_GREETING }],
    },
  ],
  transport: new DefaultChatTransport({
    api: '/api/chat',
    credentials: 'include',
    prepareSendMessagesRequest: ({ messages: requestMessages }) => ({
      body: {
        message: requestMessages.findLast((message) => message.role === 'user'),
      },
    }),
  }),
})

const isLoading = computed(() => status.value === 'submitted' || status.value === 'streaming')
const isAwaitingResponse = computed(() => status.value === 'submitted')
const errorMessage = computed(() => (error.value ? SEND_ERROR_MESSAGE : null))
const canSend = computed(() => draft.value.trim().length > 0 && !isLoading.value)

const scrollToLatestMessage = async (): Promise<void> => {
  await nextTick()
  transcript.value?.scrollTo({ top: transcript.value.scrollHeight, behavior: 'smooth' })
}

const openChat = async (): Promise<void> => {
  isOpen.value = true
  await nextTick()
  messageInput.value?.focus()
}

const closeChat = async (): Promise<void> => {
  isOpen.value = false
  await nextTick()
  launcherButton.value?.focus()
}

const sendMessage = async (): Promise<void> => {
  const message = draft.value.trim()
  if (!message || isLoading.value) return

  clearError()
  draft.value = ''
  try {
    await sendChatMessage({ text: message })
  } catch {
    // useChat exposes the request error through its reactive error state.
  } finally {
    messageInput.value?.focus()
  }
}

const retryLastMessage = async (): Promise<void> => {
  if (!error.value || isLoading.value) return
  clearError()
  try {
    await regenerate()
  } catch {
    // useChat exposes the request error through its reactive error state.
  } finally {
    messageInput.value?.focus()
  }
}

const handleInputKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  void sendMessage()
}

const handleGlobalKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    void closeChat()
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown))
watch(messages, () => void scrollToLatestMessage())
</script>

<style scoped>
.support-chat-root {
  position: fixed;
  right: max(20px, env(safe-area-inset-right));
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 1100;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
    sans-serif;
}

.support-chat-launcher {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  max-width: min(330px, calc(100vw - 32px));
  padding: 0;
  color: var(--text-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
}

.support-chat-bubble {
  position: relative;
  max-width: 220px;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--secondary-border-color);
  border-radius: 16px 16px 4px;
  box-shadow: var(--shadow-md);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
}

.support-chat-bubble::after {
  position: absolute;
  right: -8px;
  bottom: 8px;
  width: 14px;
  height: 14px;
  background: var(--bg-card);
  border-top: 1px solid var(--secondary-border-color);
  border-right: 1px solid var(--secondary-border-color);
  content: '';
  transform: rotate(45deg);
}

.support-chat-avatar {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  overflow: hidden;
  background: var(--primary-color-gradient);
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
}

.support-chat-avatar--launcher {
  width: 68px;
  height: 68px;
  box-shadow: var(--shadow-lg);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.support-chat-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translate(3.1%, 2.75%);
}

.support-chat-launcher:hover .support-chat-avatar--launcher {
  transform: translateY(-2px) scale(1.04);
}

.support-chat-launcher:hover .support-chat-bubble {
  border-color: var(--primary-color);
}

.support-chat-launcher:focus-visible,
.support-chat-close:focus-visible,
.support-chat-send:focus-visible,
.support-chat-error button:focus-visible,
.support-chat-form textarea:focus-visible {
  outline: 3px solid var(--highlight-color);
  outline-offset: 3px;
}

.support-chat-panel {
  display: flex;
  width: min(390px, calc(100vw - 40px));
  height: min(590px, calc(100dvh - 40px));
  min-height: 400px;
  overflow: hidden;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--secondary-border-color);
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
  flex-direction: column;
}

.support-chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 16px;
  color: var(--primary-text-color);
  background: var(--primary-color-gradient);
}

.support-chat-heading {
  min-width: 0;
  flex: 1;
}

.support-chat-heading h2,
.support-chat-heading p {
  margin: 0;
}

.support-chat-heading h2 {
  font-size: 1rem;
  font-weight: 700;
}

.support-chat-heading p {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.8rem;
}

.support-chat-close {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: inherit;
  background: rgba(255, 255, 255, 0.12);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.support-chat-close:hover {
  background: rgba(255, 255, 255, 0.24);
}

.support-chat-close svg,
.support-chat-send svg {
  width: 20px;
  height: 20px;
}

.support-chat-transcript {
  display: flex;
  min-height: 0;
  padding: 18px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-secondary);
  scroll-behavior: smooth;
}

.support-chat-message-row {
  display: flex;
}

.support-chat-message-row--user {
  justify-content: flex-end;
}

.support-chat-message {
  max-width: 82%;
  margin: 0;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 0.92rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.support-chat-message--assistant {
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--secondary-border-color);
  border-bottom-left-radius: 4px;
}

.support-chat-message--user {
  color: var(--primary-text-color);
  background: var(--primary-color-gradient);
  border-bottom-right-radius: 4px;
}

.support-chat-thinking {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 52px;
  min-height: 20px;
}

.support-chat-thinking-dot {
  width: 6px;
  height: 6px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: support-chat-bounce 1.2s ease-in-out infinite;
}

.support-chat-thinking-dot:nth-of-type(2) {
  animation-delay: 0.15s;
}

.support-chat-thinking-dot:nth-of-type(3) {
  animation-delay: 0.3s;
}

.support-chat-error {
  padding: 12px;
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 0.86rem;
}

.support-chat-error p {
  margin: 0 0 9px;
}

.support-chat-error button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  color: #991b1b;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.support-chat-error button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.support-chat-error svg {
  width: 15px;
  height: 15px;
}

.support-chat-form {
  display: flex;
  align-items: flex-end;
  gap: 9px;
  padding: 13px 13px 7px;
  background: var(--bg-card);
  border-top: 1px solid var(--secondary-border-color);
}

.support-chat-form textarea {
  min-width: 0;
  min-height: 43px;
  max-height: 110px;
  padding: 10px 12px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--secondary-border-color);
  border-radius: 10px;
  flex: 1;
  font: inherit;
  line-height: 1.35;
  resize: vertical;
}

.support-chat-form textarea::placeholder {
  color: var(--text-tertiary);
}

.support-chat-form textarea:focus {
  border-color: var(--primary-color);
}

.support-chat-form textarea:disabled {
  cursor: wait;
  opacity: 0.7;
}

.support-chat-send {
  display: inline-flex;
  width: 43px;
  height: 43px;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--primary-text-color);
  background: var(--primary-color-gradient);
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  flex: 0 0 auto;
}

.support-chat-send:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.support-chat-send:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.support-chat-hint {
  margin: 0;
  padding: 0 14px 11px;
  color: var(--text-tertiary);
  background: var(--bg-card);
  font-size: 0.7rem;
  text-align: center;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dark-mode .support-chat-error {
  color: #fecaca;
  background: #450a0a;
  border-color: #7f1d1d;
}

.dark-mode .support-chat-error button {
  color: #fecaca;
}

.support-chat-panel-enter-active,
.support-chat-panel-leave-active,
.support-chat-launcher-enter-active,
.support-chat-launcher-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
  transform-origin: bottom right;
}

.support-chat-panel-enter-from,
.support-chat-panel-leave-to,
.support-chat-launcher-enter-from,
.support-chat-launcher-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}

@keyframes support-chat-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

@media (max-width: 576px) {
  .support-chat-root {
    right: max(12px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
  }

  .support-chat-panel {
    width: calc(100vw - 24px);
    height: calc(100dvh - 24px);
    min-height: 0;
    border-radius: 15px;
  }

  .support-chat-launcher {
    max-width: calc(100vw - 24px);
  }

  .support-chat-bubble {
    max-width: min(210px, calc(100vw - 110px));
    padding: 11px 13px;
    font-size: 0.88rem;
  }

  .support-chat-avatar--launcher {
    width: 62px;
    height: 62px;
  }

  .support-chat-hint {
    padding-bottom: max(11px, env(safe-area-inset-bottom));
  }
}

@media (max-height: 480px) and (orientation: landscape) {
  .support-chat-panel {
    height: calc(100dvh - 20px);
    min-height: 0;
  }

  .support-chat-header {
    padding-top: 9px;
    padding-bottom: 9px;
  }

  .support-chat-hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .support-chat-panel-enter-active,
  .support-chat-panel-leave-active,
  .support-chat-launcher-enter-active,
  .support-chat-launcher-leave-active,
  .support-chat-avatar--launcher,
  .support-chat-send {
    transition: none;
  }

  .support-chat-thinking-dot {
    animation: none;
  }
}
</style>
