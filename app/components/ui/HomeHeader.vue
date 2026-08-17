<template>
  <header class="header" role="banner">
    <div class="logo-container">
      <img src="@assets/decku-logo-text.png" alt="Decku Logo" class="logo" />
    </div>
    <h1 class="title">Steam Deck Unofficial Database</h1>
    <p class="subtitle">The definitive aggregator of community reports! Optimize every game for best performance on the Deck.</p>
  </header>
</template>

<script>
export default {
  name: 'HomeHeader',
}
</script>

<style scoped>
.header {
  text-align: center;
  margin-bottom: 60px;
}

.logo-container {
  margin-bottom: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo {
  height: 180px;
  width: auto;
  object-fit: contain;
}

.title {
  font-size: 3rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  background: var(--primary-color-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.2rem;
  font-weight: 400;
  color: var(--text-secondary);
  margin: 10px 0 0 0;
  opacity: 0.8;
}

@media (max-width: 576px) {
  .logo-container {
    margin-bottom: 20px;
  }
  
  .logo {
    height: 100px;
    max-width: 200px;
  }
  
  .logo-text {
    font-size: 2rem;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
}
</style>