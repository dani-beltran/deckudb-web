<template>
  <div class="admin-layout">
    <a href="#admin-main-content" class="admin-skip-link">Skip to admin content</a>
    <main id="admin-main-content" class="admin-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  --admin-primary: #3154d8;
  --admin-primary-hover: #2745b9;
  --admin-text: #172033;
  --admin-text-muted: #667085;
  --admin-border: #d8deea;
  --admin-surface: #ffffff;
  --admin-surface-muted: #f5f7fb;
  --admin-danger: #c82d3a;
  --admin-danger-hover: #a9232e;
  position: fixed;
  inset: 0;
  min-width: 320px;
  overflow-y: auto;
  color: var(--admin-text);
  background: linear-gradient(145deg, #f7f9fc 0%, #e7edf7 100%);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.admin-main {
  min-height: 100%;
}

.admin-skip-link {
  position: fixed;
  top: 0;
  left: 1rem;
  z-index: 100;
  padding: 0.65rem 1rem;
  color: #fff;
  background: var(--admin-primary);
  border-radius: 0 0 0.5rem 0.5rem;
  text-decoration: none;
  transform: translateY(-110%);
  transition: transform 0.15s ease;
}

.admin-skip-link:focus {
  transform: translateY(0);
}
</style>
