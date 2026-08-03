import { z } from 'zod'
import { STEAMDECK_VERIFICATION_STATUS } from '../services/steam/steam.types'

export enum STEAMDECK_RATING {
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  NATIVE = 'native',
  UNSUPPORTED = 'unsupported',
  BORKED = 'borked',
}

export enum STEAMDECK_HARDWARE {
  OLED = 'oled',
  LCD = 'lcd',
}

export const gameIdSchema = z.coerce.number().int().positive('ID must be a positive integer')

export const gameSchema = z.object({
  game_id: gameIdSchema,
  game_performance_summary: z.string().optional().nullable(),
  steamdeck_rating: z.enum(STEAMDECK_RATING).optional().nullable(),
  steamdeck_verified: z.boolean().optional().nullable(),
  steamdeck_verification_status: z.enum(STEAMDECK_VERIFICATION_STATUS).optional().nullable(),
  rescrape_requested: z.boolean().optional(),
  regenerate_requested: z.boolean().optional(),
  generated_at: z.date().optional(),
  updated_at: z.date(),
  created_at: z.date(),
})

export const gameInputSchema = gameSchema.omit({
  game_id: true,
  generated_at: true,
  updated_at: true,
  created_at: true,
})

// Type exports
export type Game = z.infer<typeof gameSchema>
export type GameInput = z.infer<typeof gameInputSchema>
