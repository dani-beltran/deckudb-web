<template>
  <section :class="['ask-ai-card', cardClass]" :aria-label="title ?? undefined">
    <div class="ask-ai-header">
      <h3 v-if="title">{{ title }}</h3>
      <slot name="header" v-if="!title"></slot>
      <Button
        v-if="isCollapsed"
        :disabled="!content.length"
        class="ask-ai-button"
        @click="toggleCollapsed"
        :aria-expanded="!isCollapsed"
        :aria-label="buttonLabel"
      >
        <Sparkles :class="['ask-ai-icon', { 'sparkle-animate': content.length }]" />
        <span>{{ buttonLabel }}</span>
      </Button>
    </div>
    <ExpandTransition
      :show="!isCollapsed"
      content-class="ai-content"
    >
      <div class="typewriter-container">
        <div class="typewriter-text" v-html="displayedContent"></div>
        <div class="footer-container">
          <Tooltip :text="typewriter.isTyping.value ? 'DeckuBot is typing...' : 'Brought to you by DeckuBot'" position="right">
          <img 
            src="/favicon-256x256.png" 
            alt="DeckuBot logo" 
            :class="['decku-logo', { 'logo-typing': typewriter.isTyping.value }]"
          />
          </Tooltip>
          <FeedbackButtons 
            :show="typewriter.isComplete.value"
            @feedback="handleFeedback"
          />
        </div>
      </div>
    </ExpandTransition>
    <Notification
      message="Thanks for your feedback!"
      :show="showNotification"
      @hide="hideNotification"
    />
  </section>
</template>

<script lang="ts">
import { Sparkles } from 'lucide-vue-next'
import { computed, defineComponent, type PropType, ref, watch } from 'vue'
import { useTypewriter } from '../../composables/useTypewriter'
import Button from '../base/Button.vue'
import ExpandTransition from '../base/ExpandTransition.vue'
import Notification from '../base/Notification.vue'
import Tooltip from '../base/Tooltip.vue'
import FeedbackButtons from './FeedbackButtons.vue'

type FeedbackType = 'positive' | 'negative'

export default defineComponent({
  name: 'AskAICard',
  components: {
    Sparkles,
    Button,
    ExpandTransition,
    Tooltip,
    Notification,
    FeedbackButtons,
  },
  props: {
    title: {
      type: String as PropType<string | null>,
      default: null,
    },
    cardClass: {
      type: String,
      default: '',
    },
    buttonLabel: {
      type: String,
      default: 'Ask AI',
    },
    animateText: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      default: '',
    },
    typeSpeed: {
      type: Number,
      default: 50, // milliseconds per character
    },
    startDelay: {
      type: Number,
      default: 500, // delay before starting animation
    },
  },
  emits: {
    toggle: (_isCollapsed: boolean) => true,
    feedback: (_type: FeedbackType) => true,
  },
  setup(props, { emit }) {
    const isCollapsed = ref(true)
    const textContentRef = ref(props.content)
    const showNotification = ref(false)

    // Initialize typewriter with reactive text
    const typewriter = useTypewriter({
      text: textContentRef,
      typeSpeed: props.typeSpeed,
      startDelay: props.startDelay,
    })

    // Update textContentRef when prop changes
    watch(
      () => props.content,
      (newValue) => {
        textContentRef.value = newValue
      }
    )

    // Computed property for the text to display
    const displayedContent = computed(() => {
      if (props.animateText) {
        return typewriter.displayedText.value
      }
      return props.content
    })

    const toggleCollapsed = () => {
      isCollapsed.value = !isCollapsed.value
      emit('toggle', isCollapsed.value)

      if (!isCollapsed.value && props.animateText && props.content) {
        typewriter.start()
      }
    }

    const handleFeedback = (type: FeedbackType) => {
      emit('feedback', type)
      showNotification.value = true
    }

    const hideNotification = () => {
      showNotification.value = false
    }

    return {
      isCollapsed,
      displayedContent,
      toggleCollapsed,
      handleFeedback,
      hideNotification,
      showNotification,
      typewriter,
    }
  },
})
</script>

<style scoped>
.ask-ai-card {
  margin-bottom: 30px;
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--secondary-border-color);
  border-radius: 12px;
}

.ask-ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  gap: 12px;
}

.ask-ai-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 500;
}

.ask-ai-button {
  background: linear-gradient(135deg, #8B5CF6, #A855F7);
}

.ask-ai-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  transition: transform 0.3s ease;
}

.sparkle-animate {
  animation: sparkle-pulse 2s ease-in-out infinite;
}

@keyframes sparkle-pulse {
  0%, 100% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.1) rotate(5deg);
  }
  50% {
    transform: scale(1.05) rotate(-5deg);
  }
  75% {
    transform: scale(1.1) rotate(5deg);
  }
}

.ask-ai-button:not(:disabled):hover {
  background: linear-gradient(135deg, #7C3AED, #9333EA);
}

.ask-ai-button:not(:disabled):focus {
  outline: 2px solid #A855F7;
  outline-offset: 2px;
}

.ask-ai-close-button {
  background: transparent;
  border: 1px solid var(--secondary-border-color);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ask-ai-close-button:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--primary-border-color);
  transform: translateY(-1px);
}

.ask-ai-close-button:active {
  transform: translateY(0);
}

.ask-ai-close-button:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.ai-content {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 1rem;
}

/* Remove margin-bottom from header when collapsed */
.ask-ai-card:has(.expand-content[style*="display: none"]) .ask-ai-header {
  margin-bottom: 0;
}

/* Fallback for browsers that don't support :has() */
@supports not selector(:has(*)) {
  .ask-ai-header {
    margin-bottom: 15px;
  }
}

/* Typewriter Animation Styles */
.typewriter-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-height: 1.6em; /* Prevent layout shift */
}

.typewriter-text {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 1rem;
  white-space: pre-wrap; /* Preserve whitespace and line breaks */
  word-wrap: break-word;
  flex: 1;
}

.footer-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.decku-logo {
  width: 32px;
  height: 32px;
  margin-top: 2px;
  flex-shrink: 0;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.logo-typing {
  animation: logo-pulse 1.5s ease-in-out infinite;
}

@keyframes logo-pulse {
  0%, 100% {
    transform: scale(0.85);
    opacity: 0.8;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
