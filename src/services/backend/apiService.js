import axios from 'axios'
import Cookies from 'js-cookie'

/**
 * Backend API Service
 */
class ApiService {
  constructor() {
    // Use localhost in development, production URL otherwise
    this.baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.deckudb.com'
  }

  /**
   * Fetch deckudb game entry by game ID
   * @param {string|number} gameId - The Steam game ID
   * @returns {Promise<Object>} - The game details data or processing status
   * @throws {Error} - Throws error with appropriate message for different error types
   */
  async fetchGame(gameId) {
    if (!gameId) {
      throw new Error('Game ID is required')
    }

    try {
      const { data } = await axios.get(`${this.baseUrl}/games/${encodeURIComponent(gameId)}`)
      return data
    } catch (err) {
      console.error('Error fetching game settings:', err)
      return null
    }
  }

  async fetchSteamGame(gameId) {
    if (!gameId) {
      throw new Error('Game ID is required')
    }

    try {
      const { data } = await axios.get(`${this.baseUrl}/steam/games/${encodeURIComponent(gameId)}`)
      return data
    } catch (err) {
      console.error('Error fetching Steam game details:', err)
      return null
    }
  }

  async searchSteamGamesByName(term, limit = 10) {
    if (!term) {
      throw new Error('Search term is required')
    }

    const searchUrl = `${this.baseUrl}/steam/games?term=${encodeURIComponent(term)}&limit=${limit}`
    const { data } = await axios.get(searchUrl)
    return data
  }

  async fetchSteamGamesByIds(gameIds) {
    if (!gameIds || gameIds.length === 0) {
      throw new Error('At least one game ID is required')
    }

    try {
      const idsParam = gameIds.map((id) => encodeURIComponent(id)).join(',')
      const { data } = await axios.get(`${this.baseUrl}/steam/games/batch?ids=${idsParam}`)
      return data
    } catch (err) {
      console.error('Error fetching Steam games by IDs:', err)
      return []
    }
  }

  /**
   * Fetch most played Steam Deck games
   * @param {number} page - Page number (1-based)
   * @param {number} page_size - Number of games per page
   * @returns {Promise<{items: Object[], total: number}>} - Array of games and total count
   * @throws {Error} - Throws error if request fails
   */
  async fetchMostPlayedGames(page = 1, page_size = 20) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: page_size.toString()
      })
      const { data } = await axios.get(`${this.baseUrl}/steam/most-played-steam-deck-games?${params}`)
      return data
    } catch (err) {
      console.error('Error fetching most played games:', err)
      return []
    }
  }

  async fetchAuthUser() {
    try {
      const { data } = await axios.get(`${this.baseUrl}/auth/user`, { withCredentials: true })
      return data
    } catch (err) {
      console.error('Error fetching authenticated user:', err)
      return null
    }
  }

  loginWithSteam() {
    Cookies.set('login_referer', window.location.href)
    window.location.href = `${this.baseUrl}/auth/steam`
  }

  logout() {
    Cookies.set('logout_referer', window.location.href)
    window.location.href = `${this.baseUrl}/auth/logout`
  }

  async submitVote(gameSettingId, voteType) {
    try {
      if (!gameSettingId) {
        throw new Error('Game ID is required to submit a vote')
      }
      if (!['up', 'down'].includes(voteType)) {
        throw new Error('Invalid vote type. Must be "up" or "down"')
      }

      await axios.post(
        `${this.baseUrl}/games/${gameSettingId}/vote`,
        { vote: voteType },
        { withCredentials: true }
      )
    } catch (err) {
      console.error('Error submitting vote:', err)
    }
  }

  async removeVote(gameSettingId) {
    try {
      if (!gameSettingId) {
        throw new Error('Game ID is required to remove a vote')
      }
      await axios.delete(`${this.baseUrl}/games/${gameSettingId}/vote`, { withCredentials: true })
    } catch (err) {
      console.error('Error removing vote:', err)
    }
  }

  async submitGameSummaryVote(gameId, voteType) {
    try {
      if (!gameId) {
        throw new Error('Game ID is required to submit a summary vote')
      }
      if (!['up', 'down'].includes(voteType)) {
        throw new Error('Invalid vote type. Must be "up" or "down"')
      }

      await axios.post(
        `${this.baseUrl}/games/${gameId}/summary-vote`,
        { vote_type: voteType },
        { withCredentials: true }
      )
    } catch (err) {
      console.error('Error submitting game summary vote:', err)
    }
  }
}

// Export a singleton instance
export default new ApiService()
