import type { NitroApp } from 'nitropack'
import { bootstrapDependencies, createDBIndexes } from '../utils/bootstrap'
import logger from '../utils/logger'

/**
 * This plugin bootstraps the database dependencies and creates necessary indexes on server startup.
 * It also ensures that the database connection is properly closed when the server shuts down.
 * The dependencies are made available in the request context for use in API handlers.
 */
export default defineNitroPlugin((nitroApp: NitroApp) => {
  // Bootstrap the database dependencies and create indexes on startup.
  const dependenciesPromise = bootstrapDependencies()
    .then(async (dependencies) => {
      await createDBIndexes(dependencies)
      logger.info('Database initialized and indexes verified')
      return dependencies
    })
    .catch((error) => {
      logger.error('Database initialization failed:', error)
    })

  // Ensure that the database connection is closed when the application shuts down.
  nitroApp.hooks.hook('close', async () => {
    try {
      const dependencies = await dependenciesPromise
      await dependencies?.databaseClient.disconnect()
    } catch (error) {
      logger.error('Error closing database connection:', error)
    }
  })

  // Expose the dependencies to the request context so that they can be used in the API handlers.
  nitroApp.hooks.hook('request', async (req) => {
    const dependencies = await dependenciesPromise
    if (!dependencies) {
      throw new Error('Database dependencies not initialized')
    }
    req.context = {
      ...req.context,
      ...dependencies,
    }
  })
})
