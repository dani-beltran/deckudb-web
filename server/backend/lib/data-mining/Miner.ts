import type { ScrapeStructuredResult } from '@danilidonbeltran/webscrapper'
import type { GameReportBody, ScrapedContent } from './scrapes.schema'

export type MinedData = {
  reports: GameReportBody[]
}

export interface Miner {
  /**
   * Scrape data for a given url
   * @param {string} url The URL to scrape
   */
  scrape(url: string): Promise<ScrapeStructuredResult>
  /**
   * Convert scraped data into a useful structured format, discarding unnecessary details.
   * @param {ScrapedContent} result The raw scraped content to be polished
   */
  polish(result: ScrapedContent): MinedData
  /** Close any resources used by the miner */
  close(): void
}

export interface MinerConstructor {
  new (): Miner
  /**
   * Static method to get the URL to scrape for a given game ID.
   *
   * This is useful because some sources URLs may be inferred from the game ID.
   * @param {number} gameId The ID of the game to get the URL for
   * @returns {string} The URL to scrape
   */
  getUrl(gameId: number): string
}
