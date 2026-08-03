export interface FirecrawlSearchParams {
  query: string
  limit?: number
  lang?: string
  country?: string
  tbs?: string
  scrapeOptions?: {
    formats?: ('markdown' | 'html' | 'rawHtml')[]
    onlyMainContent?: boolean
  }
}

export interface FirecrawlWebResult {
  title: string
  description: string
  url: string
  markdown?: string
  html?: string
  rawHtml?: string
  links?: string[]
  metadata?: {
    title: string
    description: string
    sourceURL: string
    url: string
    statusCode: number
    error?: string
  }
}

export interface FirecrawlSearchResponse {
  success: boolean
  data: {
    web: FirecrawlWebResult[]
  }
  warning?: string
  creditsUsed?: number
}
