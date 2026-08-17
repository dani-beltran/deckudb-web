/**
 * Parses a relative date string (e.g., "2 months ago") and returns the corresponding Date object.
 * @param relativeDate
 * @returns Date or null if parsing fails
 */
export const parseRelativeDate = (relativeDate: string): Date | null => {
  const now = new Date()
  const match = relativeDate.match(
    /(\d+)\s*(second|sec|s|minute|min|hour|hr|h|day|dy|d|week|wk|w|month|mo|year|yr|y)s?\s+ago/i
  )

  if (!match) return null

  const [, amountText, unitText] = match
  if (!amountText || !unitText) return null

  const amount = parseInt(amountText, 10)
  const unit = unitText.toLowerCase()

  switch (unit) {
    case 'second':
    case 'sec':
    case 's':
      now.setSeconds(now.getSeconds() - amount)
      break
    case 'minute':
    case 'min':
      now.setMinutes(now.getMinutes() - amount)
      break
    case 'hour':
    case 'hr':
    case 'h':
      now.setHours(now.getHours() - amount)
      break
    case 'day':
    case 'dy':
    case 'd':
      now.setDate(now.getDate() - amount)
      break
    case 'week':
    case 'wk':
    case 'w':
      now.setDate(now.getDate() - amount * 7)
      break
    case 'month':
    case 'mo':
      now.setMonth(now.getMonth() - amount)
      break
    case 'year':
    case 'yr':
    case 'y':
      now.setFullYear(now.getFullYear() - amount)
      break
  }

  return now
}
