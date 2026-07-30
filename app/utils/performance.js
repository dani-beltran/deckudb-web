// Web Vitals performance monitoring
// This script helps track Core Web Vitals metrics for SEO optimization

/**
 * Initialize performance monitoring for Core Web Vitals
 * Tracks: LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift)
 */
function initPerformanceMonitoring() {
  // Check if the browser supports the Performance Observer API
  if ('PerformanceObserver' in window) {
    // Track Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]

      // LCP should be under 2.5 seconds for good user experience
      const lcp = lastEntry.startTime
      console.log('LCP:', lcp, 'ms')

      // You can send this data to analytics service
      if (window.gtag) {
        gtag('event', 'LCP', {
          custom_parameter: lcp,
        })
      }
    })

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (_e) {
      console.warn('LCP monitoring not supported')
    }

    // Track First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // FID should be under 100ms for good user experience
        const fid = entry.processingStart - entry.startTime
        console.log('FID:', fid, 'ms')

        if (window.gtag) {
          gtag('event', 'FID', {
            custom_parameter: fid,
          })
        }
      }
    })

    try {
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch (_e) {
      console.warn('FID monitoring not supported')
    }

    // Track Cumulative Layout Shift (CLS)
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      }

      // CLS should be under 0.1 for good user experience
      console.log('CLS:', clsValue)

      if (window.gtag) {
        gtag('event', 'CLS', {
          custom_parameter: clsValue,
        })
      }
    })

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (_e) {
      console.warn('CLS monitoring not supported')
    }
  }

  // Track Time to First Byte (TTFB)
  window.addEventListener('load', () => {
    const navigationEntries = performance.getEntriesByType('navigation')
    if (navigationEntries.length > 0) {
      const navigation = navigationEntries[0]
      const ttfb = navigation.responseStart - navigation.fetchStart
      console.log('TTFB:', ttfb, 'ms')

      if (window.gtag) {
        gtag('event', 'TTFB', {
          custom_parameter: ttfb,
        })
      }
    }
  })
}

// Initialize monitoring when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPerformanceMonitoring)
} else {
  initPerformanceMonitoring()
}

export { initPerformanceMonitoring }
