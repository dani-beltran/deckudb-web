import { reactive, readonly } from 'vue'
import apiService from '../services/backend/apiService.js'

/**
 * User Store
 * Manages authenticated user state and prevents redundant API calls
 */
const state = reactive({
  user: null,
  loading: false,
  error: null,
  lastFetched: null,
  isAuthenticated: false,
  authCheckComplete: false, // Track if we've checked auth at least once
})

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

/**
 * Fetch the authenticated user from the backend
 * Uses cached data if available and not expired
 * @param {boolean} forceRefresh - Force a fresh fetch even if cached data exists
 * @returns {Promise<Object|null>} The user data or null
 */
async function fetchUser(forceRefresh = false) {
  const now = Date.now()

  // Return cached user if available and not expired
  if (!forceRefresh && state.authCheckComplete && state.lastFetched) {
    const cacheValid = now - state.lastFetched < CACHE_DURATION
    if (cacheValid) {
      return state.user
    }
  }

  // Prevent duplicate simultaneous requests
  if (state.loading) {
    // Wait for the current request to complete
    return new Promise((resolve) => {
      const checkLoading = setInterval(() => {
        if (!state.loading) {
          clearInterval(checkLoading)
          resolve(state.user)
        }
      }, 100)
    })
  }

  state.loading = true
  state.error = null

  try {
    const user = await apiService.fetchAuthUser()
    state.user = user
    state.isAuthenticated = user !== null
    state.authCheckComplete = true
    state.lastFetched = Date.now()
    return user
  } catch (error) {
    state.error = error.message || 'Failed to fetch user'
    state.isAuthenticated = false
    state.authCheckComplete = true
    state.lastFetched = Date.now()
    console.error('Error in userStore.fetchUser:', error)
    return null
  } finally {
    state.loading = false
  }
}

/**
 * Clear the user from the store (e.g., on logout)
 */
function clearUser() {
  state.user = null
  state.lastFetched = null
  state.error = null
  state.isAuthenticated = false
  state.authCheckComplete = false
}

/**
 * Update the user data in the store
 * @param {Object} userData - The updated user data
 */
function setUser(userData) {
  state.user = userData
  state.isAuthenticated = userData !== null
  state.authCheckComplete = true
  state.lastFetched = Date.now()
}

/**
 * Check if the user is authenticated (synchronous)
 * @returns {boolean} True if user is authenticated
 */
function isAuthenticated() {
  return state.isAuthenticated
}

function signIn() {
  clearUser()
  apiService.loginWithSteam()
}

function signOut() {
  clearUser()
  apiService.logout()
}

export default {
  state: readonly(state),
  fetchUser,
  clearUser,
  setUser,
  isAuthenticated,
  signIn,
  signOut,
}
