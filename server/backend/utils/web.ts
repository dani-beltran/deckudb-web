/**
 * Using Google favicon service to get the favicon image for a given website url.
 * @param url website url
 * @param size size of the favicon image (default: 64). Google supports 16, 32, 64, 128, 256.
 * @returns an url to the favicon image that best matches the specified size.
 */
export const getFaviconUrl = (url: string, size: number = 64): string => {
  const { origin } = new URL(url)
  return `https://www.google.com/s2/favicons?domain=${origin}&sz=${size}`
}

/**
 *  @example
 * [
 * 	[ "timestamp" ],
 * 	[ "20220722061159" ]
 * ]
 */
type WaybackResponse = Array<Array<string>>

/**
 * Fetches the approximate published date of a website using the Wayback Machine API.
 */
export const getWebsiteApproximatePublishedDate = async (url: string): Promise<Date | null> => {
  const apiUrl = `http://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=1&fl=timestamp&order=asc`
  const res = await fetch(apiUrl, { method: 'GET' })
  if (!res.ok) {
    return null
  }

  const data = (await res.json().catch(() => [])) as WaybackResponse
  if (!data[0] || data[0][0] !== 'timestamp' || !data[1] || !data[1][0]) {
    return null
  }

  const timestamp = data[1][0]
  const year = timestamp.slice(0, 4)
  const month = timestamp.slice(4, 6)
  const day = timestamp.slice(6, 8)
  const dateString = `${year}-${month}-${day}`
  const date = new Date(dateString)
  return Number.isNaN(date.getTime()) ? null : date
}
