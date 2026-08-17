/**
 * Flattens a nested object into a flat array of key-value pairs
 * @param {Object} obj - The object to flatten
 * @param {string} parentKey - The parent key for nested properties
 * @param {Array} result - The accumulator array for results
 * @returns {Array} An array of objects with 'key' and 'value' properties
 */
export function flattenObject(obj, parentKey = '', result = []) {
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key
      const value = obj[key]

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        flattenObject(value, newKey, result)
      } else {
        // Add the key-value pair to results
        result.push({
          key: newKey,
          value: Array.isArray(value) ? JSON.stringify(value) : value,
        })
      }
    }
  }
  return result
}
