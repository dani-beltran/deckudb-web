import type { Collection, Db } from 'mongodb'
import type { Repository } from '../utils/bootstrap'
import { type Game, type GameInput, gameInputSchema } from './games.schema'

/**
 * GamesModel is responsible for managing game data in the database.
 */
export class GamesModel implements Repository {
  private collection: Collection<Game>

  constructor(private readonly db: Db) {
    this.collection = this.db.collection<Game>('games')
  }

  fetchGameById = async (id: number) => {
    return this.collection.findOne({ game_id: id })
  }

  saveGame = async (id: number, game: GameInput) => {
    const validatedGame: GameInput = gameInputSchema.parse(game)
    return this.collection.updateOne(
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
    await this.collection.insertMany(games)
  }

  createIndexes = async () => {
    // Create unique index on game_id (primary key)
    await this.collection.createIndex({ game_id: 1 }, { unique: true })
  }
}
