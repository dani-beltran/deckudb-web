import type { Db } from 'mongodb'
import type { Repository } from '../utils/bootstrap'
import { type GameSummaryVote, VOTE_TYPE } from './game-summary-votes.schema'

const collection = 'game-summary-votes'

/**
 * This model allows users to upvote or downvote AI summaries, and calculates the overall score based on these votes.
 *
 * The model ensures that each user (identified by session_id) can only vote once per game summary.
 */
export class GameSummaryVotesModel implements Repository {
  constructor(private readonly db: Db) {}

  /**
   * Records a user's vote (upvote or downvote) for a specific game summary.
   * If the user has already voted, their previous vote will be updated to the new vote type.
   */
  voteGameSummary = async (gameId: number, sessionId: string, type: VOTE_TYPE) => {
    return this.db.collection<GameSummaryVote>(collection).updateOne(
      { game_id: gameId, session_id: sessionId },
      {
        $set: {
          vote_type: type,
          updated_at: new Date(),
        },
        $setOnInsert: {
          session_id: sessionId,
          game_id: gameId,
          created_at: new Date(),
        },
      },
      { upsert: true }
    )
  }

  /**
   * Calculates the total score for a given game summary based on user votes.
   * The score is computed as the number of upvotes minus the number of downvotes.
   */
  getGameSummaryVoteScore = async (gameId: number) => {
    return this.db
      .collection<GameSummaryVote>(collection)
      .aggregate([
        { $match: { game_id: gameId } },
        {
          $group: {
            _id: '$game_id',
            score: {
              $sum: {
                $cond: [
                  { $eq: ['$vote_type', VOTE_TYPE.UP] },
                  1,
                  { $cond: [{ $eq: ['$vote_type', VOTE_TYPE.DOWN] }, -1, 0] },
                ],
              },
            },
          },
        },
      ])
      .toArray()
      .then((results) => (results[0] ? results[0].score : 0))
  }

  createIndexes = async () => {
    await this.db
      .collection(collection)
      .createIndex({ game_id: 1, session_id: 1 }, { unique: true })
  }
}
