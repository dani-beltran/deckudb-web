/**
 * Checks if the provided value is a plain object (i.e., an object created by the Object constructor or with a null prototype).
 * This function returns true for plain objects and false for arrays, null, Date, Map, Set, and other non-object types.
 * @param value - The value to check.
 * @returns True if the value is a plain object, false otherwise.
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  )
}

/**
 * Removes properties with undefined values from the given plain object.
 *
 * Considerations:
 *
 * - If an array is encountered, it will be left unchanged, even if it has
 * undefined values, as arrays are not considered plain objects.
 * - Avoid circular references when using deep stripping, as this function does not handle them and may cause a stack overflow.
 * - When using deep stripping, it returns a deep copy of the original object.
 *
 * @param obj - The object to process.
 * @param deep - Whether to recursively remove undefined values from nested plain objects.
 * @returns A new object with undefined values removed.
 */
export const stripUndefined = (
  obj: Record<string, unknown>,
  deep = false
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, deep && isPlainObject(v) ? stripUndefined(v, true) : v])
  )
}

/**
 * Retrieves a required value from a record by key, throwing an error if the key is missing or
 * the value is undefined/null.
 *
 * Optionally includes the collection name in the error message for better context.
 */
export const getRequired = <T>(
  records: Record<string, T | undefined | null>,
  key: string,
  collectionName?: string
): T => {
  const value = records[key]
  if (value === undefined || value === null) {
    throw new Error(
      `The field "${key}" is required${collectionName ? ` in ${collectionName}` : ''}`
    )
  }
  return value
}
