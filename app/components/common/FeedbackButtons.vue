<template>
  <Transition name="fade-slide">
    <div v-if="show" class="feedback-buttons">
      <button 
        :class="['feedback-button', 'up', { active: selectedFeedback === 'positive' }]"
        @click="handleFeedback('positive')"
        aria-label="Thumbs up"
        title="Helpful"
      >
        <ThumbsUp class="icon" />
      </button>
      <button 
        :class="['feedback-button', 'down', { active: selectedFeedback === 'negative' }]"
        @click="handleFeedback('negative')"
        aria-label="Thumbs down"
        title="Not helpful"
      >
        <ThumbsDown class="icon" />
      </button>
    </div>
  </Transition>
</template>

<script>
import { ThumbsDown, ThumbsUp } from 'lucide-vue-next'
import { ref } from 'vue'

export default {
  name: 'FeedbackButtons',
  components: {
    ThumbsUp,
    ThumbsDown,
  },
  props: {
    show: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['feedback'],
  setup(_props, { emit }) {
    const selectedFeedback = ref(null)

    const handleFeedback = (type) => {
      selectedFeedback.value = type
      emit('feedback', type)
    }

    return {
      selectedFeedback,
      handleFeedback,
    }
  },
}
</script>

<style scoped>
/* Fade slide animation for feedback buttons */
.fade-slide-enter-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-slide-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.feedback-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.feedback-button {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #606060;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s, color 0.2s;
}

.feedback-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
  color: #b0b0b0;
}

.feedback-button:hover {
  transform: translateY(-1px);
}

.feedback-button .icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.feedback-button.up.active,
.feedback-button.up:hover {
  background: #e8f0fe;
  color: #1967d2;
}

.feedback-button.down.active,
.feedback-button.down:hover {
  background: #fbe9e7;
  color: #d23f31;
}

/* Dark mode styles */
.dark-mode .feedback-button {
  color: #a0a0a0;
}

.dark-mode .feedback-button:disabled {
  background: #2a2a2a;
  color: #505050;
}

.dark-mode .feedback-button.up.active,
.dark-mode .feedback-button.up:hover {
  background: #1e3a5f;
  color: #6ba3e8;
}

.dark-mode .feedback-button.down.active,
.dark-mode .feedback-button.down:hover {
  background: #4a2323;
  color: #e87a6e;
}
</style>
