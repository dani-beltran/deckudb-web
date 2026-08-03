import { type SectionData, WebScraper } from '@danilidonbeltran/webscrapper'
import { parseSteamdeckHardware } from './helpers/parsers'
import type { Miner } from './Miner'
import { type GameReportBody, SCRAPE_SOURCES, type ScrapedContent } from './scrapes.schema'

export class SharedeckMiner implements Miner {
  private scraper: WebScraper

  constructor() {
    this.scraper = new WebScraper({
      sectionSelectors: ['#reports article'],
      waitForSelector: '#reports',
      browser: 'chromium',
      headless: true,
      timeout: 15_000,
    })
  }

  static getUrl(gameId: number): string {
    return `https://sharedeck.games/reports?app_id=${gameId}`
  }

  async scrape(url: string) {
    const result = await this.scraper.scrapeTextStructured(url)
    return result
  }

  close() {
    this.scraper.close()
  }

  polish(result: ScrapedContent) {
    if (!result.sections) {
      return { reports: [] }
    }
    const filteredSections = result.sections.filter(
      (section) => section.otherText && section.otherText.length > 0
    )
    const reports: GameReportBody[] = filteredSections.map((section) => {
      return this.buildGameReport(section, result.url)
    })
    return { reports }
  }

  private buildGameReport(section: SectionData, url: string): GameReportBody {
    const items = section.otherText
    const graphicsPreset = this.cleanValue(this.findValue(items, /graphics preset/i))
    const resolution = this.cleanValue(this.findValue(items, /resolution/i)).replace(/[\s]/g, '')
    return {
      title: `${graphicsPreset} - ${resolution}`,
      source: SCRAPE_SOURCES.SHAREDECK,
      url: `${url}#${section.id}`,
      reporter: {
        username: this.findValue(items, /to be able to vote/i) || 'Anonymous',
        user_profile_url: section.links[0]?.href || '',
        user_profile_avatar_url: section.images[0]?.src,
      },
      battery_performance: {
        life_span: items[0].replace(/[\n]/g, '').trim(),
        consumption: items[1],
      },
      steamdeck_hardware: parseSteamdeckHardware(items[4]),
      steamdeck_settings: {
        screen_refresh_rate: this.extractInteger(this.findValue(items, /screen refresh rate/i)),
        tdp_limit: this.extractInteger(this.findValue(items, /tdp limit/i)),
        proton_version: this.cleanValue(this.findValue(items, /proton version/i)),
        steamos_version: this.cleanValue(this.findValue(items, /steamos version/i)),
        frame_rate_cap: this.extractInteger(this.findValue(items, /framerate limit/i)),
      },
      game_settings: {
        graphics_preset: graphicsPreset,
        frame_rate_limit:
          this.extractInteger(this.findValue(items, /framerate limit/i))?.toString() || '',
        resolution: resolution,
      },
      steamdeck_experience: {
        average_frame_rate: this.extractInteger(items[2]),
      },
      notes: this.getNotes(section),
      posted_at: null,
    }
  }

  private extractInteger(value: string): number | undefined {
    const match = value.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : undefined
  }

  /**
   * Clean a string value by removing new lines, trimming whitespace,
   * removing unwanted values like "N/A", "Unknown" or "NONE".
   */
  private cleanValue(value: string): string {
    return value
      .replace(/[\n]/g, '')
      .replace(/^(N\s*\/\s*A|\bUnknown\b|\bNONE\b|\bNO\b)$/i, '')
      .trim()
  }

  private findValue(texts: string[], match: RegExp): string {
    for (let i = 0; i < texts.length; i++) {
      const matchResult = texts[i].match(match)
      if (matchResult) {
        return texts[i + 1] || ''
      }
    }
    return ''
  }

  private getNotes(section: SectionData): string {
    const notesStartindex = section.otherText.indexOf('Note')
    if (notesStartindex === -1) {
      return ''
    }
    const noteEndIndex = section.otherText.indexOf('Sign in with Steam')
    return (section.otherText || [])
      .slice(notesStartindex + 1, noteEndIndex)
      .join(' ')
      .replace(/[\n]/g, ' ')
      .trim()
  }
}
