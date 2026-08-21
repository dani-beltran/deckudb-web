import type { Db } from 'mongodb'
import type { Repository } from '../utils/bootstrap'
import { type GameReport, type GameReportBody, gameReportBodySchema } from './game-reports.schema'

const collection = 'game-reports'

export class GameReportsModel implements Repository {
  constructor(private readonly db: Db) {}

  /**
   * Fetch all reports for a specific game
   */
  fetchGameReportsByGameId = async (gameId: number): Promise<GameReport[]> => {
    return this.db.collection<GameReport>(collection).find({ game_id: gameId }).toArray()
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

    return this.db.collection<GameReport>(collection).insertMany(gameReports)
  }

  /**
   * Replace all game reports for a specific game with new ones.
   */
  replaceGameReportsForGame = async (gameId: number, reports: GameReportBody[]) => {
    const gameReportsCollection = this.db.collection<GameReport>(collection)

    const sources = Array.from(new Set(reports.map((r) => r.source)))
    for (const source of sources) {
      await gameReportsCollection.deleteMany({ game_id: gameId, source })
    }

    return this.insertGameReportsBulk(gameId, reports)
  }

  /**
   * Inserts game reports directly into the database for testing purposes.
   * This bypasses any validation or business logic, so it should only
   * be used in test scenarios where you need to set up specific game report states or conditions.
   */
  insertTestGameReports = async (gameReports: GameReport[]) => {
    await this.db.collection<GameReport>(collection).insertMany(gameReports)
  }

  // Create indexes for the game-reports collection
  createIndexes = async () => {
    // Create index on game_id (primary query field)
    await this.db.collection<GameReport>(collection).createIndex({ game_id: 1 })

    // Create compound index for game_id and source to optimize queries filtering by both fields
    await this.db.collection<GameReport>(collection).createIndex({ game_id: 1, source: 1 })
  }
}
