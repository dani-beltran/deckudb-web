import logger from '../../config/logger'
import type {
  FirecrawlSearchParams,
  FirecrawlSearchResponse,
  FirecrawlWebResult,
} from './firecrawl.types'

export default class FirecrawlService {
  private apiKey: string
  private baseUrl = 'https://api.firecrawl.dev/v2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Search the web and optionally scrape the results.
   * POST /v2/search
   */
  async search(params: FirecrawlSearchParams): Promise<FirecrawlWebResult[]> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: response.statusText }))) as {
        error?: string
      }
      throw new Error(
        `Firecrawl API error (${response.status}): ${errorData.error ?? response.statusText}`
      )
    }

    const data = (await response.json()) as FirecrawlSearchResponse

    if (data.creditsUsed !== undefined) {
      logger.info(`Firecrawl credits used: ${data.creditsUsed}`)
    }

    return data.data?.web ?? []
  }
}
