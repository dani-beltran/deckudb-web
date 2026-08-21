import { type ScrapeStructuredResult, WebScraper } from '@danilidonbeltran/webscrapper'
import dayjs from 'dayjs'
import { parseSteamdeckHardware } from './helpers/parsers'
import type { MinedData, Miner } from './Miner'
import { SCRAPE_SOURCES, type ScrapedContent } from './scrapes.schema'

export class YoutubeMiner implements Miner {
  private scraper: WebScraper

  constructor() {
    this.scraper = new WebScraper({
      groups: [
        {
          name: 'owner',
          // Selector for user channel name
          selector: '#owner',
          wait: true,
          required: true,
        },
        {
          name: 'info',
          selector: '#info',
          wait: true,
          required: true,
        },
      ],

      browser: 'chromium',
      headless: true,
      timeout: 30_000,
      plugin: async (page) => {
        // Handle YouTube consent popup if it appears
        const consent = page.locator('ytd-consent-bump-v2-lightbox')
        const rejectBtn = consent.getByRole('button').nth(1)
        if (await rejectBtn.isVisible({ timeout: 2_000 })) {
          await rejectBtn.click()
        }
        // Expand the video description to ensure all content can be scraped
        const expandButton = page.locator('#primary #expand')
        await expandButton.waitFor({ state: 'visible' })
        await expandButton.click()
        const description = page.locator('#primary #expanded')
        await description.waitFor({ state: 'visible' })
      },
    })
  }

  scrape(url: string): Promise<ScrapeStructuredResult> {
    return this.scraper.scrapeTextStructured(url)
  }

  polish(result: ScrapedContent): MinedData {
    if (!result.groups) {
      return { reports: [] }
    }

    const channelName = result.groups[0]?.links?.[0]?.text || ''
    const channelUrl = result.groups[0]?.links?.[0]?.href || ''
    const avatar = result.groups[0]?.images?.[0]?.src || ''
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
    const infoSections = scrape.groups?.filter((s) => s.id === 'info')
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
