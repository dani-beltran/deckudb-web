import z from 'zod'

export enum SCRAPE_SOURCES {
  PROTONDB = 'protondb',
  SHAREDECK = 'sharedeck',
  YOUTUBE = 'youtube',
  OTHER = 'other',
}

export const gameSourceSchema = z.object({
  game_id: z.number(),
  source: z.enum(SCRAPE_SOURCES),
  url: z.url(),
  meta: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  created_at: z.date(),
  updated_at: z.date(),
})

export const gameSourceCreateSchema = gameSourceSchema.omit({
  created_at: true,
  updated_at: true,
})

export type GameSource = z.infer<typeof gameSourceSchema>
export type GameSourceCreate = z.infer<typeof gameSourceCreateSchema>
