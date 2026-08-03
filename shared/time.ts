/**
 * Returns the number of milliseconds until the next occurrence of the specified time of the
 * day (hours, minutes, seconds, milliseconds).
 * @param hours
 * @param minutes
 * @param seconds
 * @param milliseconds
 */
export const getMsUntilNextHour = (hours: number, minutes = 0, seconds = 0, milliseconds = 0) => {
  const now = new Date()
  const next = new Date(now)

  next.setHours(hours, minutes, seconds, milliseconds)
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }

  return next.getTime() - now.getTime()
}

type TimeUnit =
  | 'milliseconds'
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'days'
  | 'weeks'
  | 'months'
  | 'years'

/**
 * Returns the time difference between two dates in the specified unit.
 * @param date1 The first date.
 * @param date2 The second date.
 * @param unit The unit of time to return the difference in. Defaults to "seconds".
 */
export const getTimeBetweenDates = (date1: Date, date2: Date, unit: TimeUnit = 'seconds') => {
  if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) {
    throw new Error('Invalid date(s) provided')
  }

  const diffInMs = Math.abs(date2.getTime() - date1.getTime())
  switch (unit) {
    case 'milliseconds':
      return diffInMs
    case 'seconds':
      return Math.floor(diffInMs / 1000)
    case 'minutes':
      return Math.floor(diffInMs / (1000 * 60))
    case 'hours':
      return Math.floor(diffInMs / (1000 * 60 * 60))
    case 'days':
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    case 'weeks':
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 7))
    case 'months':
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 30))
    case 'years':
      return Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365))
    default: {
      const _exhaustiveCheck: never = unit
      throw new Error(`Unsupported unit: ${unit}`)
    }
  }
}
