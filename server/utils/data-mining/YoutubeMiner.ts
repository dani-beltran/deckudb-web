import { type ScrapeStructuredResult, WebScraper } from '@danilidonbeltran/webscrapper'
import dayjs from 'dayjs'
import { parseSteamdeckHardware } from './helpers/parsers'
import type { MinedData, Miner } from './Miner'
import { SCRAPE_SOURCES, type ScrapedContent } from './scrapes.schema'

export class YoutubeMiner implements Miner {
  private scraper: WebScraper

  constructor() {
    this.scraper = new WebScraper({
      sectionSelectors: [
        // Selector for user channel name
        '#owner',
        // Selector for video description
        '#info',
      ],
      waitForSelector: '#owner', // Wait for the channel name to load as an indicator that the page is ready
      browser: 'chromium',
      headless: true,
      timeout: 30_000,
      interactionSteps: [{ event: 'click', target: '#expand', wait: 1000 }],
    })
  }

  scrape(url: string): Promise<ScrapeStructuredResult> {
    return this.scraper.scrapeTextStructured(url)
  }

  polish(result: ScrapedContent): MinedData {
    if (!result.sections) {
      return { reports: [] }
    }

    const channelName = result.sections[0]?.links?.[0]?.text || ''
    const channelUrl = result.sections[0]?.links?.[0]?.href || ''
    const avatar = result.sections[0]?.images?.[0]?.src || ''
    const postedAt = this.findDate(result)

    return {
      reports: [
        {
          title: result.title || 'YouTube Video',
          url: result.url,
          notes: result.description || '',
          reporter: {
            username: channelName,
            user_profile_url: channelUrl || '',
            user_profile_avatar_url: avatar || '',
          },
          source: SCRAPE_SOURCES.YOUTUBE,
          posted_at: postedAt,
          steamdeck_hardware: parseSteamdeckHardware(`${result.title} ${result.description}`),
        },
      ],
    }
  }

  close(): void {
    this.scraper.close()
  }

  private findDate(scrape: ScrapedContent): Date | null {
    const infoSections = scrape.sections?.filter((s) => s.id === 'info')
    if (!infoSections || infoSections.length === 0) {
      return null
    }

    for (const section of infoSections) {
      for (const text of section.otherText) {
        let date: dayjs.Dayjs | null = null

        if (text.match(/([A-Za-z]{3}\s\d{1,2},\s\d{4})/i)) {
          date = dayjs(text, 'MMM D, YYYY', true)
        } else if (text.match(/(\d{1,2}\.\d{1,2}\.\d{4})/i)) {
          date = dayjs(text, 'D.M.YYYY', true)
        }

        if (date?.isValid()) {
          return new Date(Date.UTC(date.year(), date.month(), date.date(), 0, 0, 0, 0))
        }
      }
    }

    return null
  }
}
