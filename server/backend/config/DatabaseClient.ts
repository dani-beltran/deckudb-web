import { type Db, MongoClient } from 'mongodb'
import { useRuntimeConfig } from '#imports'
import logger from './logger'

export class DatabaseClient {
  private client: MongoClient | null = null
  private connectionName: string

  constructor(connectionName?: string) {
    this.connectionName = connectionName || 'app'
  }

  connect = async (): Promise<Db> => {
    try {
      const { mongodbDatabase: dbName, mongodbUri: uri } = useRuntimeConfig()

      logger.info(`Connecting ${this.connectionName} to MongoDB ${dbName}...`)

      const client = new MongoClient(uri)
      await client.connect()

      this.client = client
      const db = client.db(dbName)
      logger.info(`Connected ${this.connectionName} to MongoDB ${dbName}`)

      return db
    } catch (error) {
      logger.error(`MongoDB ${this.connectionName} connection error:`, error)
      throw error
    }
  }

  disconnect = async (): Promise<void> => {
    if (this.client) {
      try {
        await this.client.close()
        logger.info(`MongoDB ${this.connectionName} connection closed.`)
      } catch (error) {
        logger.error(`Error closing MongoDB ${this.connectionName} connection:`, error)
      } finally {
        this.client = null
      }
    }
  }

  getDB = (): Db => {
    if (!this.client) {
      throw new Error(`Database not initialized for ${this.connectionName}. Call connect() first.`)
    }
    return this.client.db()
  }

  getClient = (): MongoClient => {
    if (!this.client) {
      throw new Error(`Database not initialized for ${this.connectionName}. Call connect() first.`)
    }
    return this.client
  }

  flushDB = async (): Promise<void> => {
    if (!this.client) {
      throw new Error(`Database not initialized for ${this.connectionName}. Call connect() first.`)
    }
    const db = this.client.db()
    const collections = await db.collections()
    for (const collection of collections) {
      await collection.deleteMany({})
    }
    logger.info('Database flushed: all collections cleared.')
  }
}
