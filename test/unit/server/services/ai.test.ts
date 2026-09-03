import { createDeckuBotTools, generateAIText } from '@server/services/ai'
import { createClaudeModel } from '@server/services/ai/model'
import type { ServerDependencies } from '@server/utils/bootstrap'
import { MockLanguageModelV4 } from 'ai/test'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@server/services/ai/model', () => ({
  createClaudeModel: vi.fn(),
}))

const usage = {
  inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 4, text: 4, reasoning: undefined },
}

describe('AI SDK services', () => {
  beforeEach(() => vi.clearAllMocks())

  it('generates text through the shared configured model', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [{ type: 'text', text: 'A concise performance summary.' }],
        finishReason: { unified: 'stop', raw: undefined },
        usage,
        warnings: [],
      }),
    })
    vi.mocked(createClaudeModel).mockReturnValue(model)

    await expect(
      generateAIText({
        prompt: 'Summarize these reports.',
        instructions: 'Be concise.',
        maxOutputTokens: 300,
        temperature: 0.3,
      })
    ).resolves.toBe('A concise performance summary.')

    expect(model.doGenerateCalls).toHaveLength(1)
    expect(model.doGenerateCalls[0]).toMatchObject({
      maxOutputTokens: 300,
      temperature: 0.3,
    })
    expect(JSON.stringify(model.doGenerateCalls[0]?.prompt)).toContain('Summarize these reports.')
    expect(JSON.stringify(model.doGenerateCalls[0]?.prompt)).toContain('Be concise.')
  })

  it('returns bounded, application-owned game data from DeckuBot tools', async () => {
    const repositories = {
      steamCache: {
        getSearchResults: vi.fn().mockResolvedValue({
          items: [
            {
              id: 620,
              name: 'Portal 2',
              type: 'game',
              platforms: { windows: true, mac: true, linux: true },
              controller_support: 'full',
            },
            { id: 10, name: 'Non-game result', type: 'demo', platforms: {} },
          ],
          total: 2,
        }),
        getGameDetails: vi.fn().mockResolvedValue({ name: 'Portal 2' }),
      },
      games: {
        fetchGameById: vi.fn().mockResolvedValue({
          steamdeck_verification_status: 'verified',
          steamdeck_rating: 'platinum',
          game_performance_summary: 'Runs smoothly at 60 FPS.',
        }),
      },
      gameReports: {
        fetchGameReportsByGameId: vi.fn().mockResolvedValue([
          {
            title: 'Recent report',
            notes: 'Stable performance with default settings.',
            source: 'protondb',
            url: 'https://example.com/report',
            posted_at: new Date('2026-08-01T00:00:00.000Z'),
          },
        ]),
      },
    } as unknown as ServerDependencies['repositories']
    const tools = createDeckuBotTools(repositories)
    const executionOptions = { toolCallId: 'tool-1', messages: [], context: {} }

    const searchResult = await tools.searchGames.execute?.({ query: 'Portal' }, executionOptions)
    expect(searchResult).toEqual({
      games: [
        {
          steamAppId: 620,
          name: 'Portal 2',
          platforms: { windows: true, mac: true, linux: true },
          controllerSupport: 'full',
        },
      ],
    })

    const performanceResult = await tools.getGamePerformance.execute?.(
      { steamAppId: 620 },
      executionOptions
    )
    expect(performanceResult).toMatchObject({
      game: {
        steamAppId: 620,
        name: 'Portal 2',
        officialSteamDeckStatus: 'verified',
        protonDbRating: 'platinum',
        performanceSummary: 'Runs smoothly at 60 FPS.',
      },
      reports: [
        {
          title: 'Recent report',
          notes: 'Stable performance with default settings.',
          url: 'https://example.com/report',
          postedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      hasCommunityData: true,
    })
  })
})
