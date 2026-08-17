/**
 * Utility functions for device detection and responsive behavior
 */

/**
 * Checks if the current device is mobile based on screen width
 * @param {number} breakpoint - The breakpoint in pixels (default: 768)
 * @returns {boolean} True if the device is considered mobile
 */
export function isMobile(breakpoint = 768) {
  return window.innerWidth <= breakpoint
}

/**
 * Checks if the current device is tablet based on screen width
 * @param {number} minWidth - Minimum width for tablet (default: 768)
 * @param {number} maxWidth - Maximum width for tablet (default: 1024)
 * @returns {boolean} True if the device is considered tablet
 */
export function isTablet(minWidth = 768, maxWidth = 1024) {
  const width = window.innerWidth
  return width > minWidth && width <= maxWidth
}

/**
 * Checks if the current device is desktop based on screen width
 * @param {number} breakpoint - The breakpoint in pixels (default: 1024)
 * @returns {boolean} True if the device is considered desktop
 */
export function isDesktop(breakpoint = 1024) {
  return window.innerWidth > breakpoint
}

/**
 * Gets the current device type as a string
 * @returns {string} 'mobile', 'tablet', or 'desktop'
 */
export function getDeviceType() {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}
