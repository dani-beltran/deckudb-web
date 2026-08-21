import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtondbMiner } from '@server/utils/data-mining/ProtondbMiner'
import { type ScrapedContent, STEAMDECK_HARDWARE, STEAMDECK_RATING } from '@server/utils/data-mining/scrapes.schema'

// Mock fetch
global.fetch = vi.fn()

// Helper to create a group with required fields
const createGroup = (overrides: Record<string, unknown> = {}) => ({
  id: 'section-1',
  title: 'Test Report',
  headings: {},
  paragraphs: ['Test content'],
  otherText: ['test_user'],
  links: [{ href: 'https://protondb.com/users/test_user', text: '' }],
  lists: [],
  images: [],
  ...overrides,
})

// Helper to create scraped content
const createScrapedContent = (overrides: Partial<ScrapedContent> = {}): ScrapedContent => ({
  title: 'ProtonDB',
  url: 'https://www.protondb.com/app/1091500',
  ...overrides,
})

describe('ProtondbMiner', () => {
  let miner: ProtondbMiner

  beforeEach(() => {
    vi.clearAllMocks()
    miner = new ProtondbMiner()
  })

  describe('getSteamdeckRating', () => {
    it('should return platinum rating when tier is platinum', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'platinum',
        }),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBe(STEAMDECK_RATING.PLATINUM)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.protondb.com/api/v1/reports/summaries/1091500.json'
      )
    })

    it('should return gold rating when tier is gold', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'gold',
        }),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBe(STEAMDECK_RATING.GOLD)
    })

    it('should return native rating when tier is native', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'native',
        }),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBe(STEAMDECK_RATING.NATIVE)
    })

    it('should return unsupported rating when tier is unsupported', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'unsupported',
        }),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBe(STEAMDECK_RATING.UNSUPPORTED)
    })

    it('should return borked rating when tier is borked', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'borked',
        }),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBe(STEAMDECK_RATING.BORKED)
    })

    it('should handle uppercase tier values', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'PLATINUM',
        }),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBe(STEAMDECK_RATING.PLATINUM)
    })

    it('should return undefined when tier is unknown', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'unknown',
        }),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBeUndefined()
    })

    it('should return undefined when API response is not OK', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBeUndefined()
    })

    it('should return undefined when tier is missing', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBeUndefined()
    })

    it('should return undefined when fetch throws an error', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBeUndefined()
    })

    it('should return silver for silver tier (not in enum)', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'silver',
        }),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBe(STEAMDECK_RATING.SILVER)
    })

    it('should return undefined for bronze tier (not in enum)', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tier: 'bronze',
        }),
      })

      const result = await ProtondbMiner.getSteamdeckRating(1091500)

      expect(result).toBeUndefined()
    })
  })

  describe('getUrl', () => {
    it('should generate correct ProtonDB URL for game ID', () => {
      const url = ProtondbMiner.getUrl(1091500)
      expect(url).toBe('https://www.protondb.com/app/1091500?device=steamDeck')
    })

    it('should handle different game IDs', () => {
      const url = ProtondbMiner.getUrl(570)
      expect(url).toBe('https://www.protondb.com/app/570?device=steamDeck')
    })
  })

  describe('polish', () => {
    it('should return empty reports array when groups are missing', () => {
      const result = createScrapedContent()

      const polished = miner.polish(result)

      expect(polished.reports).toEqual([])
    })

    it('should convert groups to game reports', () => {
      const result = createScrapedContent({
        groups: [
          createGroup({
            title: 'Great performance!',
            paragraphs: ['Game runs smoothly', 'No issues found'],
            otherText: ['john_doe'],
            links: [
              { href: 'https://protondb.com/users/john_doe', text: '' },
              { href: '', text: '' },
              { href: 'https://protondb.com/report/1', text: '' },
              { href: '', text: '2 months ago' },
            ],
            images: [{ src: 'https://example.com/avatar.jpg', alt: '', title: '' }],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)
      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      const report = polished.reports[0]!
      expect(report.title).toBe('Great performance!')
      expect(report.notes).toBe('Game runs smoothly\n\nNo issues found')
      expect(report.reporter.username).toBe('john_doe')
      expect(report.reporter.user_profile_url).toBe('https://protondb.com/users/john_doe')
      expect(report.reporter.user_profile_avatar_url).toBe('https://example.com/avatar.jpg')
      expect(report.url).toBe('https://protondb.com/report/1')
    })

    it('should filter out reports with empty notes and title', () => {
      const result = createScrapedContent({
        groups: [
          createGroup({ title: '', paragraphs: [''] }),
          createGroup({ title: 'Valid report', paragraphs: ['Good game'] }),
          createGroup({ title: 'Still valid report', paragraphs: [''] }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(2)
      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.title).toBe('Valid report')
      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[1]!.title).toBe('Still valid report')
    })

    it('should detect LCD hardware from notes', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['Playing on LCD model'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.steamdeck_hardware).toBe(STEAMDECK_HARDWARE.LCD)
    })

    it('should detect OLED hardware from notes', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['Testing on OLED screen'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.steamdeck_hardware).toBe(STEAMDECK_HARDWARE.OLED)
    })

    it('should detect frame rate from notes', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['Running at 60 fps'] })],
      })

      const polished = miner.polish(result)
      
      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.steamdeck_settings?.frame_rate_cap).toBe(60)
    })

    it('should detect TDP limit from notes', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['TDP set to 10W'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.steamdeck_settings?.tdp_limit).toBe(10)
    })

    it('should detect refresh rate from notes', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['Display set to 90 Hz'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.steamdeck_settings?.screen_refresh_rate).toBe(90)
    })

    it('should parse posted date from relative time', () => {
      const result = createScrapedContent({
        groups: [
          createGroup({
            paragraphs: ['Test report'],
            links: [
              { href: 'https://protondb.com/users/user', text: '' },
              { href: '', text: '' },
              { href: 'https://protondb.com/report/1', text: '' },
              { href: '', text: '2 days ago' },
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.posted_at).toBeInstanceOf(Date)
    })

    it('should handle missing posted date', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['Test report'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.posted_at).toBeNull()
    })

    it('should sort reports by posted date in descending order', () => {
      const result = createScrapedContent({
        groups: [
          createGroup({
            id: '1',
            title: 'Old report',
            paragraphs: ['Old content'],
            links: [
              { href: 'https://protondb.com/users/user1', text: '' },
              { href: '', text: '' },
              { href: 'https://protondb.com/report/1', text: '' },
              { href: '', text: '2 days ago' },
            ],
          }),
          createGroup({
            id: '2',
            title: 'New report',
            paragraphs: ['New content'],
            links: [
              { href: 'https://protondb.com/users/user2', text: '' },
              { href: '', text: '' },
              { href: 'https://protondb.com/report/2', text: '' },
              { href: '', text: '1 day ago' },
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(2)

      // Most recent should be first
      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.title).toBe('New report')
      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[1]!.title).toBe('Old report')
    })

    it('should use result URL when report URL is missing', () => {
      const result = createScrapedContent({
        url: 'https://www.protondb.com/app/1091500',
        groups: [createGroup({ paragraphs: ['Content'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.url).toBe('https://www.protondb.com/app/1091500')
    })

    it('should handle complex TDP patterns', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['Watts: ~15'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.steamdeck_settings?.tdp_limit).toBe(15)
    })

    it('should handle multiple settings in one report', () => {
      const result = createScrapedContent({
        groups: [
          createGroup({
            paragraphs: ['Running on LCD at 60fps, 90Hz, TDP 12W'],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      const report = polished.reports[0]!

      expect(report.steamdeck_hardware).toBe(STEAMDECK_HARDWARE.LCD)
      expect(report.steamdeck_settings?.frame_rate_cap).toBe(60)
      expect(report.steamdeck_settings?.screen_refresh_rate).toBe(90)
      expect(report.steamdeck_settings?.tdp_limit).toBe(12)
    })

    it('should handle alternative fps pattern (fps at start)', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['fps ~40'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.steamdeck_settings?.frame_rate_cap).toBe(40)
    })

    it('should handle alternative TDP pattern (watts at start)', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['watts ~8'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.steamdeck_settings?.tdp_limit).toBe(8)
    })

    it('should handle alternative refresh rate pattern', () => {
      const result = createScrapedContent({
        groups: [createGroup({ paragraphs: ['hz ~40'] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)

      // biome-ignore lint/style/noNonNullAssertion: Non-null assertion is safe here
      expect(polished.reports[0]!.steamdeck_settings?.screen_refresh_rate).toBe(40)
    })

    it('should handle whitespace trimming in notes and title', () => {
      const result = createScrapedContent({
        groups: [createGroup({ title: '   ', paragraphs: ['   '] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(0)
    })
  })
})
