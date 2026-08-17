import z from 'zod'
import { SCRAPE_SOURCES } from './game-sources.schema'
import { gameIdSchema } from './games.schema'

const sectionSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  headings: z.record(z.string(), z.array(z.string())),
  paragraphs: z.array(z.string()),
  otherText: z.array(z.string()),
  links: z.array(
    z.object({
      text: z.string(),
      href: z.string(),
    })
  ),
  lists: z.array(
    z.object({
      type: z.enum(['ul', 'ol']),
      items: z.array(z.string()),
    })
  ),
  images: z.array(
    z.object({
      src: z.string().url(),
      alt: z.string(),
      title: z.string(),
    })
  ),
})

const structuredScrapedContentSchema = sectionSchema
  .omit({ id: true })
  .partial()
  .extend({
    title: z.string(),
    description: z.string().optional(),
    url: z.url(),
    sections: z.array(sectionSchema).optional(),
  })

export const scrapeSchema = z.object({
  game_id: gameIdSchema,
  source: z.enum(SCRAPE_SOURCES),
  scraped_content: structuredScrapedContentSchema,
  created_at: z.date(),
  hash: z.string().optional(),
})

export const inputScrapeSchema = scrapeSchema.omit({
  created_at: true,
  hash: true,
})

export type Scrape = z.infer<typeof scrapeSchema>
export type InputScrape = z.infer<typeof inputScrapeSchema>
export type ScrapedContent = z.infer<typeof structuredScrapedContentSchema>
