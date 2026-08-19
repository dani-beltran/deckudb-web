import { reactive, readonly } from 'vue'

export type RecentGameId = string | number

interface RecentGamesState {
  recentGames: RecentGameId[]
}

/**
 * Recent Games Store
 * Manages recently searched games stored in localStorage
 */
export const STORAGE_KEY = 'recentSearchedGameIds'
const MAX_RECENT_GAMES = 10

function isRecentGameId(value: unknown): value is RecentGameId {
  return typeof value === 'string' || typeof value === 'number'
}

const state = reactive<RecentGamesState>({
  recentGames: [],
})

/**
 * Load recent games from localStorage
 */
function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      if (!Array.isArray(parsed) || !parsed.every(isRecentGameId)) {
        throw new TypeError('Stored recent games are invalid')
      }
      state.recentGames = parsed
    }
  } catch (error) {
    console.error('Failed to load recent games from storage:', error)
    state.recentGames = []
  }
}

/**
 * Save recent games to localStorage
 */
function saveToStorage(): void {
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
function saveRecentSearchedGameId(gameId: RecentGameId): void {
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
function getRecentGames(): RecentGameId[] {
  return [...state.recentGames]
}

/**
 * Clear all recent games
 */
function clearRecentGames(): void {
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
