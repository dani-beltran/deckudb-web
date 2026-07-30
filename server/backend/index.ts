import { createApp } from './app'
import { bootstrapDependencies, createDBIndexes } from './config/bootstrap'
import { NODE_ENV, PORT } from './config/env'
import logger from './config/logger'

// Start server
const startServer = async () => {
  try {
    const { databaseClient, dependencies } = await bootstrapDependencies()
    await createDBIndexes(dependencies)

    logger.info('Environment: ', NODE_ENV)

    const app = createApp(dependencies)

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT. Shutting down gracefully...')
      await databaseClient.disconnect()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM. Shutting down gracefully...')
      await databaseClient.disconnect()
      process.exit(0)
    })

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
