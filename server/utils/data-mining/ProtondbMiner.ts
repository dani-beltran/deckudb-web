import { type ScrapeStructuredResult, WebScraper } from '@danilidonbeltran/webscrapper'
import { parseRelativeDate } from '../../../shared/date'
import { getDateComparator } from '../../../shared/sort'
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
      groups: [
        // Selector for user reports. Sometimes there are no reports, so this group is not required.
        { name: 'reports', selector: '.for-anchor-tags', wait: true, required: false },
      ],
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
    if (!result.groups) {
      return { reports: [] }
    }
    const reports: GameReportBody[] = result.groups.map((group) => {
      const notes = group.paragraphs.join('\n\n')
      return {
        title: group.title,
        source: SCRAPE_SOURCES.PROTONDB,
        reporter: {
          username: group.otherText[0] || 'Anonymous',
          user_profile_url: group.links[0]?.href || '',
          user_profile_avatar_url: group.images[0]?.src,
        },
        url: group.links[2]?.href || result.url,
        notes,
        posted_at: this.findPostedDate(group.links),
        steamdeck_hardware: parseSteamdeckHardware(notes),
        steamdeck_settings: this.findSteamdeckConfig(notes),
      }
    })
    const meaningfulReports = reports.filter((p) => p.notes.trim() || p.title?.trim())
    return {
      reports: meaningfulReports.sort(getDateComparator('posted_at', 'desc')),
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
