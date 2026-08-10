import { initPerformanceMonitoring } from '../utils/performance.js'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(() => {
  initPerformanceMonitoring()
})
