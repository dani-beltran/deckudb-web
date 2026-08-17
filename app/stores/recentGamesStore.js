import { reactive, readonly } from 'vue'

/**
 * Recent Games Store
 * Manages recently searched games stored in localStorage
 */
const STORAGE_KEY = 'recentSearchedGameIds'
const MAX_RECENT_GAMES = 10

const state = reactive({
  recentGames: [],
})

/**
 * Load recent games from localStorage
 */
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      state.recentGames = JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load recent games from storage:', error)
    state.recentGames = []
  }
}

/**
 * Save recent games to localStorage
 */
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.recentGames))
  } catch (error) {
    console.error('Failed to save recent games to storage:', error)
  }
}

/**
 * Save a recently searched game by ID
 * @param {string|number} gameId - The game ID to save
 */
function saveRecentSearchedGameId(gameId) {
  if (!gameId) return

  // Remove the game if it already exists (to move it to the front)
  const existingIndex = state.recentGames.indexOf(gameId)
  if (existingIndex !== -1) {
    state.recentGames.splice(existingIndex, 1)
  }

  // Add the game to the beginning of the list
  state.recentGames.unshift(gameId)

  // Limit the number of recent games
  if (state.recentGames.length > MAX_RECENT_GAMES) {
    state.recentGames = state.recentGames.slice(0, MAX_RECENT_GAMES)
  }

  saveToStorage()
}

/**
 * Get the list of recently searched game IDs
 * @returns {Array} Array of recent game IDs
 */
function getRecentGames() {
  return [...state.recentGames]
}

/**
 * Clear all recent games
 */
function clearRecentGames() {
  state.recentGames = []
  saveToStorage()
}

// Initialize store by loading from storage
loadFromStorage()

export default {
  state: readonly(state),
  saveRecentSearchedGameId,
  getRecentGames,
  clearRecentGames,
}
