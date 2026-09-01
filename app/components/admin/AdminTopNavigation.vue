<template>
  <header class="admin-topbar">
    <div class="admin-topbar-inner">
      <NuxtLink class="brand-link" to="/" aria-label="DeckuDB home">
        <img
          class="brand-logo brand-logo-full"
          src="@assets/decku-logo-text.png"
          alt="DeckuDB"
        />
        <img
          class="brand-logo brand-logo-mark"
          src="@assets/decku-logo.png"
          alt="DeckuDB"
        />
      </NuxtLink>

      <div class="topbar-actions">
        <nav class="admin-navigation" aria-label="Admin navigation">
          <NuxtLink
            class="navigation-link"
            :class="{ active: isJobsActive }"
            to="/admin"
            :aria-current="isJobsActive ? 'page' : undefined"
          >
            Jobs
          </NuxtLink>
          <NuxtLink
            class="navigation-link"
            :class="{ active: isAuditActive }"
            to="/admin/audit-logs"
            aria-label="Audit logs"
            :aria-current="isAuditActive ? 'page' : undefined"
          >
            Audit
          </NuxtLink>
        </nav>

        <div ref="accountRoot" class="account-menu">
          <button
            ref="accountButton"
            type="button"
            class="account-trigger"
            aria-controls="admin-account-menu"
            :aria-expanded="menuOpen"
            @click="toggleMenu"
            @keydown.down.prevent="openMenuAndFocus"
          >
            <span class="account-avatar" aria-hidden="true">{{ userInitial }}</span>
            <span class="account-name">{{ displayName }}</span>
            <ChevronDown class="account-chevron" :class="{ open: menuOpen }" aria-hidden="true" />
          </button>

          <div v-if="menuOpen" id="admin-account-menu" class="account-popover">
            <button
              ref="logoutButton"
              type="button"
              class="logout-button"
              :disabled="loggingOut"
              @click="handleLogout"
            >
              <LogOut aria-hidden="true" />
              {{ loggingOut ? 'Signing out…' : 'Log out' }}
            </button>
            <p v-if="logoutError" class="logout-error" role="alert">{{ logoutError }}</p>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ChevronDown, LogOut } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { navigateTo, useNuxtApp, useRoute } from '#imports'
import { useAdminSession } from '../../composables/useAdminSession'
import { getApiErrorMessage, isUnauthorizedError } from '../../plugins/api/errorHelpers'

defineOptions({ name: 'AdminTopNavigation' })

const route = useRoute()
const { $adminApi } = useNuxtApp()
const adminSession = useAdminSession()
const accountRoot = ref<HTMLDivElement | null>(null)
const accountButton = ref<HTMLButtonElement | null>(null)
const logoutButton = ref<HTMLButtonElement | null>(null)
const menuOpen = ref(false)
const loggingOut = ref(false)
const logoutError = ref<string | null>(null)

const normalizedPath = computed(() => route.path.replace(/\/+$/, '') || '/')
const isJobsActive = computed(() => normalizedPath.value === '/admin')
const isAuditActive = computed(() => normalizedPath.value === '/admin/audit-logs')
const displayName = computed(() => adminSession.value.username?.trim() || 'Admin')
const userInitial = computed(() => displayName.value.charAt(0).toUpperCase())

watch(
  () => route.fullPath,
  () => closeMenu()
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})

function toggleMenu() {
  logoutError.value = null
  menuOpen.value = !menuOpen.value
}

async function openMenuAndFocus() {
  logoutError.value = null
  menuOpen.value = true
  await nextTick()
  logoutButton.value?.focus()
}

function closeMenu() {
  menuOpen.value = false
  logoutError.value = null
}

function handleOutsidePointerDown(event: PointerEvent) {
  if (!(event.target instanceof Node) || accountRoot.value?.contains(event.target)) return
  closeMenu()
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !menuOpen.value) return
  closeMenu()
  accountButton.value?.focus()
}

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutError.value = null

  try {
    await $adminApi.logoutAdmin()
    adminSession.value = { authenticated: false }
    closeMenu()
    await navigateTo('/admin/login')
  } catch (logoutFailure) {
    if (isUnauthorizedError(logoutFailure)) {
      adminSession.value = { authenticated: false }
      await navigateTo('/admin/login')
      return
    }
    logoutError.value = getApiErrorMessage(logoutFailure, 'Failed to log out')
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid rgba(216, 222, 234, 0.9);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 8px rgba(31, 42, 68, 0.05);
  backdrop-filter: blur(12px);
}

.admin-topbar-inner {
  display: flex;
  width: min(100%, 92rem);
  min-height: 4.5rem;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.6rem clamp(1rem, 3vw, 2rem);
  margin: 0 auto;
}

.brand-link {
  display: inline-flex;
  flex: none;
  align-items: center;
  border-radius: 0.5rem;
}

.brand-link:focus-visible,
.navigation-link:focus-visible,
.account-trigger:focus-visible,
.logout-button:focus-visible {
  outline: 3px solid rgba(49, 84, 216, 0.22);
  outline-offset: 2px;
}

.brand-logo {
  display: block;
  width: auto;
  object-fit: contain;
  transition: opacity 0.15s ease;
}

.brand-logo-full {
  height: 3rem;
}

.brand-logo-mark {
  display: none;
  height: 2.6rem;
}

.brand-link:hover .brand-logo {
  opacity: 0.82;
}

.topbar-actions,
.admin-navigation,
.account-trigger,
.logout-button {
  display: flex;
  align-items: center;
}

.topbar-actions {
  min-width: 0;
  gap: clamp(0.5rem, 2vw, 1.25rem);
}

.admin-navigation {
  gap: 0.25rem;
}

.navigation-link {
  padding: 0.6rem 0.85rem;
  color: var(--admin-text-muted);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.navigation-link:hover {
  color: var(--admin-text);
  background: var(--admin-surface-muted);
}

.navigation-link.active {
  color: var(--admin-primary);
  background: #edf2ff;
}

.account-menu {
  position: relative;
  flex: none;
}

.account-trigger {
  min-height: 2.65rem;
  gap: 0.55rem;
  padding: 0.3rem 0.55rem 0.3rem 0.35rem;
  color: var(--admin-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.65rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.account-trigger:hover,
.account-trigger[aria-expanded='true'] {
  background: var(--admin-surface-muted);
  border-color: var(--admin-border);
}

.account-avatar {
  display: grid;
  width: 1.9rem;
  height: 1.9rem;
  flex: none;
  color: #fff;
  background: var(--admin-primary);
  border-radius: 50%;
  font-size: 0.75rem;
  place-items: center;
}

.account-name {
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-chevron {
  width: 0.95rem;
  height: 0.95rem;
  color: var(--admin-text-muted);
  transition: transform 0.15s ease;
}

.account-chevron.open {
  transform: rotate(180deg);
}

.account-popover {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: max-content;
  min-width: 11rem;
  padding: 0.4rem;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 0.7rem;
  box-shadow: 0 14px 34px rgba(31, 42, 68, 0.16);
}

.logout-button {
  width: 100%;
  min-height: 2.4rem;
  box-sizing: border-box;
  gap: 0.55rem;
  padding: 0.55rem 0.7rem;
  color: var(--admin-danger);
  background: transparent;
  border: 0;
  border-radius: 0.45rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  text-align: left;
}

.logout-button:hover:not(:disabled) {
  background: #fff0f1;
}

.logout-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.logout-button svg {
  width: 1rem;
  height: 1rem;
}

.logout-error {
  max-width: 15rem;
  padding: 0.55rem 0.7rem;
  margin: 0.25rem 0 0;
  color: #9f1d2a;
  font-size: 0.75rem;
  line-height: 1.35;
}

@media (max-width: 660px) {
  .admin-topbar-inner {
    min-height: 4rem;
    gap: 0.65rem;
    padding-block: 0.5rem;
  }

  .brand-logo-full {
    display: none;
  }

  .brand-logo-mark {
    display: block;
  }

  .topbar-actions {
    gap: 0.35rem;
  }

  .navigation-link {
    padding-inline: 0.6rem;
  }

  .account-trigger {
    gap: 0.35rem;
  }

  .account-avatar {
    display: none;
  }

  .account-name {
    max-width: 5.5rem;
  }
}

@media (max-width: 390px) {
  .brand-logo-mark {
    height: 2.25rem;
  }

  .admin-topbar-inner {
    padding-inline: 0.7rem;
  }

  .navigation-link {
    padding-inline: 0.5rem;
    font-size: 0.8rem;
  }

  .account-trigger {
    padding-inline: 0.4rem;
    font-size: 0.8rem;
  }

  .account-name {
    max-width: 4.25rem;
  }
}
</style>
