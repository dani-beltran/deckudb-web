import type { Db } from 'mongodb'
import { type GameSummaryVote, VOTE_TYPE } from './game-summary-votes.schema'

const collection = 'game-summary-votes'

export class GameSummaryVotesModel {
  constructor(private readonly db: Db) {}

  voteGamePerformanceSummary = async (gameId: number, sessionId: string, type: VOTE_TYPE) => {
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
}
