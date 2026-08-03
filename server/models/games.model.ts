import type { Db } from 'mongodb'
import { type Game, type GameInput, gameInputSchema } from './games.schema'

const COLLECTION = 'games'

export class GamesModel {
  constructor(private readonly db: Db) {}

  fetchGameById = async (id: number) => {
    return this.db.collection<Game>(COLLECTION).findOne({ game_id: id })
  }

  saveGame = async (id: number, game: GameInput) => {
    const validatedGame: GameInput = gameInputSchema.parse(game)
    return this.db.collection<Game>(COLLECTION).updateOne(
      { game_id: id },
      {
        $set: {
          ...validatedGame,
          generated_at: new Date(),
          updated_at: new Date(),
        },
        $setOnInsert: {
          game_id: id,
          created_at: new Date(),
        },
      },
      { upsert: true }
    )
  }

  /**
   * Inserts games directly into the database for testing purposes.
   * This bypasses any validation or business logic, so it should only
   * be used in test scenarios where you need to set up specific game states or conditions.
   */
  insertTestGames = async (games: Game[]) => {
    await this.db.collection<Game>(COLLECTION).insertMany(games)
  }

  createGameIndexes = async () => {
    // Create unique index on game_id (primary key)
    await this.db.collection<Game>(COLLECTION).createIndex({ game_id: 1 }, { unique: true })
  }
}
