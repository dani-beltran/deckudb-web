import { type ScrapeStructuredResult, WebScraper } from '@danilidonbeltran/webscrapper'
import { parseRelativeDate } from '../../utils/date'
import { createDateComparator } from '../../utils/sort'
import {
  parseFrameRate,
  parseRefreshRate,
  parseSteamdeckHardware,
  parseTdpLimit,
} from './helpers/parsers'
import type { Miner } from './Miner'
import {
  type GameReportBody,
  SCRAPE_SOURCES,
  type ScrapedContent,
  STEAMDECK_RATING,
} from './scrapes.schema'

export class ProtondbMiner implements Miner {
  private scraper: WebScraper

  constructor() {
    this.scraper = new WebScraper({
      sectionSelectors: [
        // Selector for user reports
        '.for-anchor-tags',
      ],
      waitForSelector: '.for-anchor-tags',
      browser: 'chromium',
      headless: true,
      timeout: 15_000,
    })
  }

  static getUrl(gameId: number): string {
    return `https://www.protondb.com/app/${gameId}?device=steamDeck`
  }

  async scrape(url: string): Promise<ScrapeStructuredResult> {
    const result = await this.scraper.scrapeTextStructured(url)
    return result
  }

  polish(result: ScrapedContent) {
    if (!result.sections) {
      return { reports: [] }
    }
    const articles = result.sections
    const reports: GameReportBody[] = articles.map((section) => {
      const notes = (section.paragraphs || []).join('\n\n')
      return {
        title: section.title,
        source: SCRAPE_SOURCES.PROTONDB,
        reporter: {
          username: section.otherText[0],
          user_profile_url: section.links[0]?.href,
          user_profile_avatar_url: section.images[0]?.src,
        },
        url: section.links[2]?.href || result.url,
        notes,
        posted_at: this.findPostedDate(section.links || []),
        steamdeck_hardware: parseSteamdeckHardware(notes),
        steamdeck_settings: this.findSteamdeckConfig(notes),
      }
    })
    const meaningfulReports = reports.filter((p) => p.notes.trim() || p.title?.trim())
    return {
      reports: meaningfulReports.sort(createDateComparator('posted_at', 'desc')),
    }
  }

  close() {
    this.scraper.close()
  }

  static async getSteamdeckRating(gameId: number): Promise<STEAMDECK_RATING | undefined> {
    try {
      const url = `https://www.protondb.com/api/v1/reports/summaries/${gameId}.json`
      const response = await fetch(url)
      if (!response.ok) {
        return undefined
      }
      const data = (await response.json()) as { tier?: string }
      // Map the tier from the API response to STEAMDECK_RATING enum
      if (data?.tier) {
        const tier = data.tier.toUpperCase()
        if (!Object.keys(STEAMDECK_RATING).includes(tier)) {
          return undefined
        }
        const rating = STEAMDECK_RATING[tier as keyof typeof STEAMDECK_RATING]
        return rating
      }
      return undefined
    } catch (_error) {
      return undefined
    }
  }

  private findPostedDate(links: { text: string }[]): Date | null {
    const dateLink = links.find((link) => link.text.includes('ago'))
    if (dateLink) {
      // Handle direct relative date format like "2 months ago"
      const date = parseRelativeDate(dateLink.text.trim())
      // Strip time component - set to midnight UTC
      if (date) {
        date.setUTCHours(0, 0, 0, 0)
      }
      return date
    }
    return null
  }

  private findSteamdeckConfig(notes: string) {
    const lowerNotes = notes.toLowerCase()
    return {
      frame_rate_cap: parseFrameRate(lowerNotes),
      tdp_limit: parseTdpLimit(lowerNotes),
      screen_refresh_rate: parseRefreshRate(lowerNotes),
    }
  }
}
