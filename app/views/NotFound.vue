<template>
  <div class="not-found">
    <div class="error-container">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      
      <h1 class="error-title">404</h1>
      <h2 class="error-subtitle">Page Not Found</h2>
      <p class="error-message">
        Sorry, the page you're looking for doesn't exist or has been moved.
      </p>
      
      <div class="error-actions">
        <button @click="goHome" class="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          Go Home
        </button>
        
        <button @click="goBack" class="btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotFound',
  created() {
    // Set document title for 404 page
    document.title = '404 - Page Not Found | Steam Deck Settings DB'
  },
  methods: {
    goHome() {
      this.$router.push('/')
    },
    goBack() {
      // Check if there's history to go back to
      if (window.history.length > 1) {
        this.$router.go(-1)
      } else {
        this.$router.push('/')
      }
    },
  },
}
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}

.error-container {
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.error-icon {
  margin: 0 auto 2rem;
  width: 80px;
  height: 80px;
  color: var(--primary-color);
  opacity: 0.8;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-title {
  font-size: 6rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  background: var(--primary-color-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.error-subtitle {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--secondary-text-color);
}

.error-message {
  font-size: 1.1rem;
  color: var(--secondary-text-color);
  margin: 0 0 2.5rem 0;
  line-height: 1.6;
  opacity: 0.8;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  min-width: 120px;
}

.btn-primary {
  background: var(--primary-color-gradient);
  color: var(--primary-text-color);
  box-shadow: 0 4px 12px rgba(3, 112, 190, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(3, 112, 190, 0.4);
}

.btn-secondary {
  background: var(--secondary-color);
  color: var(--secondary-text-color);
  border: 2px solid var(--secondary-border-color);
}

.btn-secondary:hover {
  background: var(--secondary-bg-hover);
  border-color: var(--secondary-border-hover);
  transform: translateY(-1px);
}

.btn-primary svg, .btn-secondary svg {
  width: 18px;
  height: 18px;
}

/* Responsive design */
@media (max-width: 768px) {
  .not-found {
    min-height: 50vh;
    padding: 1rem;
  }

  .error-title {
    font-size: 4rem;
  }

  .error-subtitle {
    font-size: 1.5rem;
  }

  .error-message {
    font-size: 1rem;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
  }

  .btn-primary, .btn-secondary {
    width: 100%;
    max-width: 200px;
  }
}

@media (max-width: 480px) {
  .error-icon {
    width: 60px;
    height: 60px;
  }

  .error-title {
    font-size: 3rem;
  }
}
</style>