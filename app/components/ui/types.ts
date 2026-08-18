export type GameId = string | number

export interface GamePlatforms {
  windows?: boolean
  mac?: boolean
  linux?: boolean
}

export interface SearchGame {
  id: GameId
  steam_appid?: GameId
  name: string
  tiny_image?: string | null
  header_image?: string | null
  platforms?: GamePlatforms | null
  release_date?: string | { date?: string | null } | null
  [key: string]: unknown
}

export interface PopularGame {
  steam_appid: GameId
  id?: GameId
  name: string
  header_image?: string | null
}

export interface SteamMovie {
  webm?: {
    max?: string
  }
  mp4?: {
    max?: string
  }
  hls_h264?: string
}

export interface SteamAppPreview {
  steam_appid?: GameId
  name?: string
  type?: string
  fullgame?: {
    appid?: GameId
    name?: string | null
  } | null
  short_description?: string | null
  header_image?: string | null
  movies?: SteamMovie[] | null
}

export type SteamDeckRating = 'native' | 'silver' | 'gold' | 'platinum' | 'unsupported' | 'borked'

export interface GameDetails {
  game_id?: GameId | null
  game_performance_summary?: string | null
  steam_app?: SteamAppPreview | null
  steamdeck_rating?: SteamDeckRating | null
  steamdeck_verified?: boolean | null
  reports?: GameReportData[] | null
}

export type ReportMetric = string | number

export interface GameReportData {
  hash?: string | null
  title?: string | null
  notes: string
  url: string
  source: string
  posted_at?: string | Date | null
  reporter: {
    username: string
    user_profile_url?: string | null
    user_profile_avatar_url?: string | null
  }
  steamdeck_hardware?: string | null
  steamdeck_settings?: {
    frame_rate_cap?: ReportMetric | null
    tdp_limit?: ReportMetric | null
  } | null
  steamdeck_experience?: {
    average_frame_rate?: ReportMetric | null
  } | null
}

export interface SearchGamesResponse {
  items?: SearchGame[]
}

export interface PopularGamesResponse {
  items?: PopularGame[]
  total: number
}
