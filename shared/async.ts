/**
 * Delay execution for a specified number of milliseconds, unless aborted.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timeoutId)
      reject(signal?.reason)
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Maps an array to a new array using an asynchronous callback, then flattens the result by one level.
 * All async operations are executed in parallel.
 */
export async function flatMapAsync<T, U>(
  array: T[],
  callback: (item: T) => Promise<U[]>
): Promise<U[]> {
  const results = await mapAsync(array, callback)
  return results.flat()
}

/**
 * Maps an array to a new array using an asynchronous callback.
 * All async operations are executed in parallel.
 */
export function mapAsync<T, U>(array: T[], callback: (item: T) => Promise<U>): Promise<U[]> {
  return Promise.all(array.map(callback))
}

/**
 * Async operations executes sequentially, waiting for each one to complete before starting the next.
 */
export async function mapAsyncSequential<T, U>(
  array: T[],
  callback: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = []
  for (const item of array) {
    results.push(await callback(item))
  }
  return results
}
