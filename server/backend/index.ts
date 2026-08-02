import { useRuntimeConfig } from '#imports'
import { createApp } from './app'
import { bootstrapDependencies, createDBIndexes } from './config/bootstrap'
import logger from './config/logger'

// Start server
const startServer = async () => {
  try {
    const { backendPort, nodeEnv } = useRuntimeConfig()
    const { databaseClient, dependencies } = await bootstrapDependencies()
    await createDBIndexes(dependencies)

    logger.info('Environment: ', nodeEnv)

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

    app.listen(Number.parseInt(backendPort, 10), () => {
      logger.info(`Server is running on port ${backendPort}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
