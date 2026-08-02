import { beforeEach, describe, expect, it } from 'vitest'
import { SharedeckMiner } from './SharedeckMiner'
import { type ScrapedContent, STEAMDECK_HARDWARE } from './scrapes.schema'

// Helper to create a section with required fields
const createSection = (overrides: Record<string, unknown> = {}) => ({
  id: 'section-1',
  title: null,
  headings: {},
  paragraphs: [],
  otherText: [
    'Battery Life\n4 hours 30 minutes',
    '11W - 14W',
    '60 FPS',
    '',
    'Steam Deck LCD',
    'Screen Refresh Rate',
    '60 Hz',
    'TDP Limit',
    '12W',
    'Proton Version',
    'Proton 8.0-5',
    'SteamOS Version',
    '3.5.7',
    'Framerate Limit',
    '60',
    'Graphics Preset',
    'High',
    'Framerate Limit',
    '60',
    'Resolution',
    '1280 x 800',
    'Note',
    'Game runs great!',
    'Sign in with Steam',
  ],
  links: [{ href: 'https://sharedeck.games/users/testuser', text: '' }],
  lists: [],
  images: [{ src: 'https://example.com/avatar.jpg', alt: '', title: '' }],
  ...overrides,
})

// Helper to create scraped content
const createScrapedContent = (overrides: Partial<ScrapedContent> = {}): ScrapedContent => ({
  title: 'Sharedeck',
  url: 'https://sharedeck.games/apps/1091500',
  ...overrides,
})

describe('SharedeckMiner', () => {
  let miner: SharedeckMiner

  beforeEach(() => {
    miner = new SharedeckMiner()
  })

  describe('getUrl', () => {
    it('should generate correct Sharedeck URL for game ID', () => {
      const url = SharedeckMiner.getUrl(1091500)
      expect(url).toBe('https://sharedeck.games/reports?app_id=1091500')
    })

    it('should handle different game IDs', () => {
      const url = SharedeckMiner.getUrl(570)
      expect(url).toBe('https://sharedeck.games/reports?app_id=570')
    })
  })

  describe('polish', () => {
    it('should return empty reports array when sections are missing', () => {
      const result = createScrapedContent()

      const polished = miner.polish(result)

      expect(polished.reports).toEqual([])
    })

    it('should return empty reports array when sections have no otherText', () => {
      const result = createScrapedContent({
        sections: [createSection({ otherText: [] })],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toEqual([])
    })

    it('should convert sections to game reports', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            id: 'report-1',
            otherText: [
              'Battery Life\n4 hours 30 minutes',
              '11W - 14W',
              '60 FPS',
              '',
              'Steam Deck LCD',
              'Screen Refresh Rate',
              '60 Hz',
              'TDP Limit',
              '12W',
              'Proton Version',
              'Proton 8.0-5',
              'SteamOS Version',
              '3.5.7',
              'Framerate Limit',
              '60',
              'Graphics Preset',
              'High',
              'Framerate Limit',
              '60',
              'Resolution',
              '1280 x 800',
              'Note',
              'Game runs great!',
              'Sign in with Steam',
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(1)
      expect(polished.reports[0].title).toBe('High - 1280x800')
      expect(polished.reports[0].source).toBe('sharedeck')
      expect(polished.reports[0].url).toBe('https://sharedeck.games/apps/1091500#report-1')
      expect(polished.reports[0].notes).toBe('Game runs great!')
      expect(polished.reports[0].posted_at).toBeNull()
    })

    it('should extract reporter information', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: [
              'Battery Life\n4 hours',
              '11W',
              '60 FPS',
              '',
              'Steam Deck LCD',
              'to be able to vote',
              'john_doe',
            ],
            links: [{ href: 'https://sharedeck.games/users/john_doe', text: '' }],
            images: [{ src: 'https://example.com/avatar.jpg', alt: '', title: '' }],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].reporter.username).toBe('john_doe')
      expect(polished.reports[0].reporter.user_profile_url).toBe(
        'https://sharedeck.games/users/john_doe'
      )
      expect(polished.reports[0].reporter.user_profile_avatar_url).toBe(
        'https://example.com/avatar.jpg'
      )
    })

    it("should use 'Anonymous' as username when not found", () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: ['Battery Life\n4 hours', '11W', '60 FPS', '', 'Steam Deck LCD'],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].reporter.username).toBe('Anonymous')
    })

    it('should extract battery performance', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: [
              'Battery Life\n4 hours 30 minutes',
              '11W - 14W',
              '60 FPS',
              '',
              'Steam Deck LCD',
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].battery_performance?.life_span).toBe(
        'Battery Life4 hours 30 minutes'
      )
      expect(polished.reports[0].battery_performance?.consumption).toBe('11W - 14W')
    })

    it('should detect LCD hardware', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: ['Battery Life\n4 hours', '11W', '60 FPS', '', 'Steam Deck LCD'],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].steamdeck_hardware).toBe(STEAMDECK_HARDWARE.LCD)
    })

    it('should detect OLED hardware', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: ['Battery Life\n5 hours', '10W', '90 FPS', '', 'Steam Deck OLED'],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].steamdeck_hardware).toBe(STEAMDECK_HARDWARE.OLED)
    })

    it('should return undefined for unknown hardware', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: ['Battery Life\n4 hours', '11W', '60 FPS', '', 'Unknown Device'],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].steamdeck_hardware).toBeUndefined()
    })

    it('should extract steamdeck settings', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: [
              'Battery Life\n4 hours',
              '11W',
              '60 FPS',
              '',
              'Steam Deck LCD',
              'Screen Refresh Rate',
              '60 Hz',
              'TDP Limit',
              '12W',
              'Proton Version',
              'Proton 8.0-5',
              'SteamOS Version',
              '3.5.7',
              'Framerate Limit',
              '60',
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].steamdeck_settings?.screen_refresh_rate).toBe(60)
      expect(polished.reports[0].steamdeck_settings?.tdp_limit).toBe(12)
      expect(polished.reports[0].steamdeck_settings?.proton_version).toBe('Proton 8.0-5')
      expect(polished.reports[0].steamdeck_settings?.steamos_version).toBe('3.5.7')
      expect(polished.reports[0].steamdeck_settings?.frame_rate_cap).toBe(60)
    })

    it('should clean values by removing units and unwanted text', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: [
              'Battery Life\n4 hours',
              '11W',
              '60 FPS',
              '',
              'Steam Deck LCD',
              'Screen Refresh Rate',
              '60 Hz',
              'TDP Limit',
              '12W',
              'Framerate Limit',
              '60fps',
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      // cleanValue removes 'w' and 'fps' but not 'Hz'
      expect(polished.reports[0].steamdeck_settings?.screen_refresh_rate).toBe(60)
      expect(polished.reports[0].steamdeck_settings?.tdp_limit).toBe(12)
      expect(polished.reports[0].steamdeck_settings?.frame_rate_cap).toBe(60)
    })

    it('should remove N/A values', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: [
              'Battery Life\n4 hours',
              '11W',
              '60 FPS',
              '',
              'Steam Deck LCD',
              'TDP Limit',
              'N/A',
              'Proton Version',
              'Unknown',
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].steamdeck_settings?.tdp_limit).toBeUndefined()
      expect(polished.reports[0].steamdeck_settings?.proton_version).toBe('')
    })

    it('should extract game settings', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: [
              'Battery Life\n4 hours',
              '11W',
              '60 FPS',
              '',
              'Steam Deck LCD',
              'Graphics Preset',
              'High',
              'Framerate Limit',
              '60',
              'Resolution',
              '1280 x 800',
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].game_settings?.graphics_preset).toBe('High')
      expect(polished.reports[0].game_settings?.frame_rate_limit).toBe('60')
      expect(polished.reports[0].game_settings?.resolution).toBe('1280x800')
    })

    it('should extract steamdeck experience', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: ['Battery Life\n4 hours', '11W', '60 FPS', '', 'Steam Deck LCD'],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].steamdeck_experience?.average_frame_rate).toBe(60)
    })

    it('should extract notes correctly', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: [
              'Battery Life\n4 hours',
              '11W',
              '60 FPS',
              '',
              'Steam Deck LCD',
              'Note',
              'Game runs smoothly.',
              'No issues encountered.',
              'Sign in with Steam',
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].notes).toBe('Game runs smoothly. No issues encountered.')
    })

    it('should return empty notes when Note is not found', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: ['Battery Life\n4 hours', '11W', '60 FPS', '', 'Steam Deck LCD'],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].notes).toBe('')
    })

    it('should handle notes without Sign in delimiter', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: [
              'Battery Life\n4 hours',
              '11W',
              '60 FPS',
              '',
              'Steam Deck LCD',
              'Note',
              'This is a note.',
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].notes).toBe('')
    })

    it('should handle multiple reports', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            id: 'report-1',
            otherText: ['Battery Life\n4 hours', '11W', '60 FPS', '', 'Steam Deck LCD'],
          }),
          createSection({
            id: 'report-2',
            otherText: ['Battery Life\n5 hours', '10W', '90 FPS', '', 'Steam Deck OLED'],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports).toHaveLength(2)
      expect(polished.reports[0].url).toBe('https://sharedeck.games/apps/1091500#report-1')
      expect(polished.reports[1].url).toBe('https://sharedeck.games/apps/1091500#report-2')
    })

    it('should handle resolution with newlines', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: [
              'Battery Life\n4 hours',
              '11W',
              '60 FPS',
              '',
              'Steam Deck LCD',
              'Resolution',
              '1280\nx\n800',
            ],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].game_settings?.resolution).toBe('1280x800')
    })

    it('should handle case-insensitive hardware detection', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: ['Battery Life\n4 hours', '11W', '60 FPS', '', 'steam deck oled'],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].steamdeck_hardware).toBe(STEAMDECK_HARDWARE.OLED)
    })

    it('should handle empty images and links arrays', () => {
      const result = createScrapedContent({
        sections: [
          createSection({
            otherText: ['Battery Life\n4 hours', '11W', '60 FPS', '', 'Steam Deck LCD'],
            links: [],
            images: [],
          }),
        ],
      })

      const polished = miner.polish(result)

      expect(polished.reports[0].reporter.user_profile_url).toBe('')
      expect(polished.reports[0].reporter.user_profile_avatar_url).toBeUndefined()
    })
  })
})
