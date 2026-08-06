import { defineEventHandler } from 'h3'
import z from 'zod'
import { apiHandler, parseQuery } from '../../../utils/api'

const steamSearchQuerySchema = z.object({
  term: z.string().min(1, 'Search term is required'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    const { term, limit } = await parseQuery(event, steamSearchQuerySchema)
    const { repositories } = event.context
    return repositories.steamCache.getSearchResults(term, limit)
  })
)
