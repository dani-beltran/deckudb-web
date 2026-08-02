import type { Express } from 'express'
import { fromNodeMiddleware } from 'h3'
import { createApp } from '../backend/app'
import { bootstrapDependencies, createDBIndexes } from '../backend/lib/bootstrap'

let appPromise: Promise<Express> | undefined

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const { dependencies } = await bootstrapDependencies()
      await createDBIndexes(dependencies)
      return createApp(dependencies)
    })()
  }

  return appPromise
}

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api')) {
    return
  }

  const app = await getApp()
  return fromNodeMiddleware(app)(event)
})
