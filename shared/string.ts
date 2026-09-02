/**
 * Converts a camelCase string to snake_case.
 * @param input - The camelCase string to convert.
 * @returns The converted snake_case string.
 */
export function camelCaseToSnakeCase(input: string): string {
  // Split the input string into words based on camel case boundaries
  const words = input.replace(/([A-Z])/g, '_$1').toLowerCase()

  // Remove any leading underscore if present
  return words.startsWith('_') ? words.slice(1) : words
}
