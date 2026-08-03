import z from 'zod'

export enum VOTE_TYPE {
  UP = 'up',
  DOWN = 'down',
}

export const gameSummaryVoteSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
  game_id: z.number().int().positive(),
  vote_type: z.enum(VOTE_TYPE),
  created_at: z.date(),
  updated_at: z.date().optional(),
})

export type GameSummaryVote = z.infer<typeof gameSummaryVoteSchema>
