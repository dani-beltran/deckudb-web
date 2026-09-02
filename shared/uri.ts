/**
 * Normalizes a URI path by removing trailing slashes, except for the root path.
 */
export const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path)
