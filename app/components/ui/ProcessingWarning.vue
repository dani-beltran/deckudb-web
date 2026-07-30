<template>
  <div class="processing-warning-container">
    <div class="game-header">
      <h3 class="game-name">{{ gameName }}</h3>
      <span class="not-found-badge">Not Ready</span>
    </div>
    <div class="processing-warning">
      <h3>Game Being Processed <div class="warning-icon">⏳</div> </h3>
      <p>Our caffeinated Decku monkeys are searching the internet non-stop to find you game settings reports for this game.</p>
      <p><strong>Please, check back in a few minutes 🙏</strong> In the meantime, feel free to explore other games!</p>
      <p></p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProcessingWarning',
  props: {
    gameName: {
      type: String,
      required: true,
    },
  },
}
</script>

<style scoped>
.processing-warning-container {
  text-align: center;
}

.game-header {
  margin-bottom: 1.5rem;
}

.game-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.not-found-badge {
  display: inline-block;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

.processing-warning p {
  text-align: left;
  line-height: 1.2em;
}

.warning-icon {
  font-size: 2rem;
  display: inline-block;
  animation: spinPause 6s ease-in-out infinite;
}

@keyframes spinPause {
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(180deg);
  }
  50% {
    transform: rotate(180deg);
  }
  75% {
    transform: rotate(360deg);
  }
  100% {
    transform: rotate(360deg);
  }
}


.processing-warning {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  color: #92400e;
  padding: 20px;
  border-radius: 8px;
  text-align: left;
}

.processing-warning h3 {
  color: #92400e;
  margin: 0 0 12px 0;
  font-size: 1.2rem;
}

.processing-warning p {
  margin: 8px 0;
}
</style>