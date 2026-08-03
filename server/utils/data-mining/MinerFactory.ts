import type { Miner } from './Miner'
import { ProtondbMiner } from './ProtondbMiner'
import { SharedeckMiner } from './SharedeckMiner'
import { SCRAPE_SOURCES } from './scrapes.schema'
import { YoutubeMiner } from './YoutubeMiner'

export const buildMiner = (source: SCRAPE_SOURCES) => {
  let miner: Miner

  switch (source) {
    case SCRAPE_SOURCES.PROTONDB:
      miner = new ProtondbMiner()
      break
    case SCRAPE_SOURCES.SHAREDECK:
      miner = new SharedeckMiner()
      break
    case SCRAPE_SOURCES.YOUTUBE:
      miner = new YoutubeMiner()
      break
    case SCRAPE_SOURCES.OTHER:
      return null
    default: {
      const _exhaustiveCheck: never = source
      throw new Error(`No miner implemented for source ${source}.`)
    }
  }
  return miner
}
