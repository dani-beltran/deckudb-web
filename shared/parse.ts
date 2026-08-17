/**
 * Parse a string into a valid integer, throwing an error if it's not valid.
 * If a default value is provided, it will be returned instead of throwing an error.
 */
export const parseValidInt = (value: string, defaultValue?: number): number => {
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(`Invalid integer: ${value}`)
  }
  return parsed
}
