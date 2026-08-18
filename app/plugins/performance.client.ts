import { defineNuxtPlugin } from '#app'
import { initPerformanceMonitoring } from '../utils/performance'

export default defineNuxtPlugin(() => {
  initPerformanceMonitoring()
})
