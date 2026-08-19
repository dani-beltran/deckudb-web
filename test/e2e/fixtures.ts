import type { GameResponse } from '@server/api/games/[id].get'
import type { JobsResponse } from '@server/api/jobs/index.get'
import type { SteamGamesResponse } from '@server/api/steam/games/index.get'
import type { MostPlayedSteamDeckGamesResponse } from '@server/api/steam/most-played-steam-deck-games.get'
import type { Job } from '@server/models/jobs.schema'

type SteamSearchItem = SteamGamesResponse['items'][number]
type SteamSearchItemOverrides = Pick<SteamSearchItem, 'id' | 'name'> &
  Partial<Omit<SteamSearchItem, 'id' | 'name'>>

export function createSteamSearchItem(overrides: SteamSearchItemOverrides): SteamSearchItem {
  return {
    type: 'game',
    price: { currency: 'USD', initial: 0, final: 0 },
    tiny_image: '',
    metascore: 'N/A',
    platforms: { windows: true, mac: false, linux: false },
    streamingvideo: false,
    controller_support: 'full',
    ...overrides,
  }
}

export function createJobsResponse(items: readonly Job[]): JobsResponse {
  return {
    items: [...items],
    total: items.length,
    page: 1,
    page_size: 100,
    total_pages: items.length === 0 ? 0 : 1,
  }
}

export const portal2SearchItem = createSteamSearchItem({
  id: 620,
  name: 'Portal 2',
  platforms: { windows: true, mac: true, linux: true },
})

export const portal2GameResponse = {
  status: 'ready',
  game: {
    game_id: portal2SearchItem.id,
    game_performance_summary: null,
    steam_app: {
      steam_appid: portal2SearchItem.id,
      name: portal2SearchItem.name,
      type: 'game',
    },
    reports: [],
  },
} satisfies GameResponse

export const emptySteamGamesResponse = {
  items: [],
  total: 0,
} satisfies SteamGamesResponse

export const emptyMostPlayedGamesResponse = {
  items: [],
  total: 0,
} satisfies MostPlayedSteamDeckGamesResponse

export const serviceUnavailableResponse = {
  statusCode: 503,
  statusMessage: 'Service Unavailable',
}
