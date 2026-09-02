import type { Collection, Db } from 'mongodb'
import type { Repository } from '../utils/bootstrap'
import { type GameReport, type GameReportBody, gameReportBodySchema } from './game-reports.schema'

export class GameReportsModel implements Repository {
  private collection: Collection<GameReport>

  constructor(private readonly db: Db) {
    this.collection = this.db.collection<GameReport>('game-reports')
  }

  /**
   * Fetch all reports for a specific game
   */
  fetchGameReportsByGameId = async (gameId: number): Promise<GameReport[]> => {
    return this.collection.find({ game_id: gameId }).toArray()
  }

  /**
   * Insert multiple game reports entries for a game
   */
  insertGameReportsBulk = async (gameId: number, reports: GameReportBody[]) => {
    if (reports.length === 0) return

    const validatedReports = reports.map((report) => gameReportBodySchema.parse({ ...report }))
    const gameReports: GameReport[] = validatedReports.map((report) => ({
      ...report,
      game_id: gameId,
      updated_at: new Date(),
      created_at: new Date(),
    }))

    return this.collection.insertMany(gameReports)
  }

  /**
   * Replace all game reports for a specific game with new ones.
   */
  replaceGameReportsForGame = async (gameId: number, reports: GameReportBody[]) => {
    const sources = Array.from(new Set(reports.map((r) => r.source)))
    for (const source of sources) {
      await this.collection.deleteMany({ game_id: gameId, source })
    }

    return this.insertGameReportsBulk(gameId, reports)
  }

  /**
   * Inserts game reports directly into the database for testing purposes.
   * This bypasses any validation or business logic, so it should only
   * be used in test scenarios where you need to set up specific game report states or conditions.
   */
  insertTestGameReports = async (gameReports: GameReport[]) => {
    await this.collection.insertMany(gameReports)
  }

  // Create indexes for the game-reports collection
  createIndexes = async () => {
    // Create index on game_id (primary query field)
    await this.collection.createIndex({ game_id: 1 })

    // Create compound index for game_id and source to optimize queries filtering by both fields
    await this.collection.createIndex({ game_id: 1, source: 1 })
  }
}
