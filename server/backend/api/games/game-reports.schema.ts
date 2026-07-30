import { z } from 'zod'
import { SCRAPE_SOURCES } from '../game-sources/game-sources.schema'
import { gameIdSchema, STEAMDECK_HARDWARE } from './games.schema'

export const reporterSchema = z.object({
  username: z.string(),
  user_profile_url: z.string(),
  user_profile_avatar_url: z.string().optional(),
})

export const gameReportSchema = z.object({
  game_id: gameIdSchema,
  created_at: z.date(),
  updated_at: z.date(),
  title: z.string().nullable(),
  source: z.enum(SCRAPE_SOURCES),
  url: z.string(),
  reporter: reporterSchema,
  game_settings: z.record(z.string(), z.string()).optional(),
  steamdeck_hardware: z.enum(STEAMDECK_HARDWARE).optional(),
  steamdeck_settings: z
    .object({
      frame_rate_cap: z.number().int().optional(),
      screen_refresh_rate: z.number().int().optional(),
      proton_version: z.string().optional(),
      steamos_version: z.string().optional(),
      tdp_limit: z.number().int().optional(),
      scaling_filter: z.string().optional(),
      gpu_clock_speed: z.string().optional(),
    })
    .optional(),
  battery_performance: z
    .object({
      consumption: z.string().optional(),
      temps: z.string().optional(),
      life_span: z.string().optional(),
    })
    .optional(),
  steamdeck_experience: z
    .object({
      average_frame_rate: z.number().int().optional(),
    })
    .optional(),
  notes: z.string(),
  posted_at: z.date().nullable(),
})

export const gameReportBodySchema = gameReportSchema.omit({
  game_id: true,
  created_at: true,
  updated_at: true,
})

export type Reporter = z.infer<typeof reporterSchema>
export type GameReport = z.infer<typeof gameReportSchema>
export type GameReportBody = z.input<typeof gameReportBodySchema>
