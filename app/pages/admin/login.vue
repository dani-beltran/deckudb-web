<template>
  <section class="login-page" aria-labelledby="admin-login-title">
    <form class="login-card" @submit.prevent="submitLogin">
      <div class="login-heading">
        <span class="login-eyebrow">DeckuDB backoffice</span>
        <h1 id="admin-login-title">Sign in</h1>
        <p>Use the administrator credentials configured for this deployment.</p>
      </div>

      <div class="form-field">
        <label for="admin-username">Username</label>
        <input
          id="admin-username"
          v-model="username"
          name="username"
          type="text"
          autocomplete="username"
          required
          :disabled="submitting"
          autofocus
        />
      </div>

      <div class="form-field">
        <label for="admin-password">Password</label>
        <input
          id="admin-password"
          v-model="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          :disabled="submitting"
        />
      </div>

      <p v-if="error" class="login-error" role="alert">{{ error }}</p>

      <button class="login-submit" type="submit" :disabled="submitting">
        {{ submitting ? 'Signing in…' : 'Sign in' }}
      </button>

      <NuxtLink class="home-link" to="/">Return to DeckuDB</NuxtLink>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, navigateTo, useHead, useRoute } from '#imports'
import { getApiErrorMessage, isUnauthorizedError, loginAdmin } from '../../services/admin/api'
import { sanitizeAdminRedirect } from '../../services/admin/redirect'

definePageMeta({ layout: 'admin', name: 'AdminLogin' })
useHead({
  title: 'Admin Sign In - DeckuDB',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const route = useRoute()
const username = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

async function submitLogin() {
  if (submitting.value) return
  submitting.value = true
  error.value = null

  try {
    const session = await loginAdmin(username.value, password.value)
    if (!session.authenticated) throw new Error('Invalid username or password')
    await navigateTo(sanitizeAdminRedirect(route.query.redirect))
  } catch (loginError) {
    error.value = isUnauthorizedError(loginError)
      ? 'Invalid username or password'
      : getApiErrorMessage(loginError, 'Unable to sign in')
    password.value = ''
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 1.5rem;
}

.login-card {
  display: grid;
  width: min(100%, 26rem);
  gap: 1.25rem;
  padding: clamp(1.5rem, 5vw, 2.5rem);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 1rem;
  box-shadow: 0 20px 50px rgba(31, 42, 68, 0.13);
}

.login-heading {
  display: grid;
  gap: 0.45rem;
}

.login-eyebrow {
  color: var(--admin-primary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.login-heading h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.15;
}

.login-heading p {
  margin: 0;
  color: var(--admin-text-muted);
  line-height: 1.5;
}

.form-field {
  display: grid;
  gap: 0.45rem;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 650;
}

.form-field input {
  min-height: 2.75rem;
  box-sizing: border-box;
  padding: 0.65rem 0.8rem;
  color: var(--admin-text);
  background: #fff;
  border: 1px solid var(--admin-border);
  border-radius: 0.5rem;
  font: inherit;
}

.form-field input:focus {
  border-color: var(--admin-primary);
  outline: 3px solid rgba(49, 84, 216, 0.18);
}

.form-field input:disabled {
  opacity: 0.65;
}

.login-error {
  margin: 0;
  padding: 0.75rem;
  color: #9f1d2a;
  background: #fff0f1;
  border: 1px solid #fac8cd;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.login-submit {
  min-height: 2.75rem;
  color: #fff;
  background: var(--admin-primary);
  border: 0;
  border-radius: 0.5rem;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.login-submit:hover:not(:disabled) {
  background: var(--admin-primary-hover);
}

.login-submit:focus-visible,
.home-link:focus-visible {
  outline: 3px solid rgba(49, 84, 216, 0.25);
  outline-offset: 2px;
}

.login-submit:disabled {
  cursor: wait;
  opacity: 0.65;
}

.home-link {
  justify-self: center;
  color: var(--admin-text-muted);
  font-size: 0.875rem;
}
</style>
