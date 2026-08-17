import { defineNuxtPlugin } from '#app'
import { initPerformanceMonitoring } from '../utils/performance.js'

export default defineNuxtPlugin(() => {
  initPerformanceMonitoring()
})
