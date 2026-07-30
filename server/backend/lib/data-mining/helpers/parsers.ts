import { STEAMDECK_HARDWARE } from '../scrapes.schema'

/**
 * Parse text and try to determine if it references Steam Deck hardware, specifically the screen type (OLED or LCD).
 * @param text The text (usually from a scrape) to parse.
 * @returns {STEAMDECK_HARDWARE | undefined} The detected Steam Deck hardware type, or undefined if not found.
 */
export const parseSteamdeckHardware = (text: string): STEAMDECK_HARDWARE | undefined => {
  const lowerText = text.toLowerCase()
  if (lowerText.includes('oled')) {
    return STEAMDECK_HARDWARE.OLED
  } else if (lowerText.includes('lcd')) {
    return STEAMDECK_HARDWARE.LCD
  }
  return undefined
}

/**
 * Parse text to extract a TDP limit value in watts. It looks for patterns like
 * "X w/watts" or "tdp/watts (of/to/at/:) X".
 * @param text The text to parse for TDP limit information.
 * @returns {number | undefined} The extracted TDP limit in watts, or undefined
 * if not found or if TDP is disabled.
 */
export const parseTdpLimit = (text: string): number | undefined => {
  // Skip TDP extraction if explicitly disabled
  const tdpOffRegex = /\btdp\b\s*(?:\blimit\b\s*)?(?:\boff\b|\bdisabled\b)/i
  if (tdpOffRegex.test(text)) {
    return undefined
  }
  // TDP regex: matches "X w/watts" or "tdp/watts (of/to/at/:) X"
  const tdpRegex =
    /~?(\d+)\s*(w(?![a-z])|\bwatts?\b)|(\bwatts\b|\btdp\b)\s*(?:\blimit\b\s*)?(?:\bof\b|\bto\b|\bat\b|:|\s)\s*~?(\d+)/i
  const tdpMatch = text.match(tdpRegex)
  return tdpMatch ? parseInt(tdpMatch[1] || tdpMatch[4], 10) : undefined
}

/**
 * Parse text to extract a frame rate limit in fps. It looks for patterns like "X fps"
 *  or "fps (of/to/at/:) X".
 * @param text The text to parse for frame rate limit information.
 * @returns {number | undefined} The extracted frame rate limit in fps, or undefined if not found or if frame rate is disabled.
 */
export const parseFrameRate = (text: string): number | undefined => {
  // Skip frame rate extraction if explicitly disabled
  const fpsOffRegex = /\bfps\b\s*(\boff\b|\bdisabled\b)/i
  if (fpsOffRegex.test(text)) {
    return undefined
  }
  // FPS regex: matches "X fps" or "fps (of/to/at/:) X"
  const frameRateRegex =
    /~?(\d+)\s*fps(?![a-z])|\bfps\b\s*(?:\blimit\b\s*)?(?:\bof\b|\bto\b|\bat\b|:|\s)\s*~?(\d+)/i
  const match = text.match(frameRateRegex)
  return match ? parseInt(match[1] || match[2], 10) : undefined
}

/**
 * Parse text to extract a screen refresh rate in Hz. It looks for patterns like "X hz" or "hz
 * (of/to/at/:) X".
 * @param text The text to parse for screen refresh rate information.
 * @returns {number | undefined} The extracted screen refresh rate in Hz, or undefined if not
 * found or if refresh rate is disabled.
 */
export const parseRefreshRate = (text: string): number | undefined => {
  // Skip refresh rate extraction if explicitly disabled
  const hzOffRegex = /\bhz\b\s*(\boff\b|\bdisabled\b)/i
  if (hzOffRegex.test(text)) {
    return undefined
  }
  // Hz regex: matches "X hz" or "hz (of/to/at/:) X"
  const refreshScreenRegex =
    /~?(\d+)\s*hz(?![a-z])|\bhz\b\s*(?:\blimit\b\s*)?(?:\bof\b|\bto\b|\bat\b|:|\s)\s*~?(\d+)/i
  const match = text.match(refreshScreenRegex)
  return match ? parseInt(match[1] || match[2], 10) : undefined
}
