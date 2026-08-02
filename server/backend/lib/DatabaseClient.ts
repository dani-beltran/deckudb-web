import { type Db, MongoClient } from 'mongodb'
import logger from './logger'

type DatabaseClientOptions = {
  connectionName?: string
  mongodbDatabase: string
  mongodbUri: string
}

export class DatabaseClient {
  private client: MongoClient | null = null
  private readonly opts: DatabaseClientOptions

  constructor(opts: DatabaseClientOptions) {
    this.opts = opts
    this.opts.connectionName = opts.connectionName || 'app'
  }

  connect = async (): Promise<Db> => {
    const { connectionName, mongodbDatabase: dbName, mongodbUri: uri } = this.opts

    try {
      logger.info(`Connecting ${connectionName} to MongoDB ${dbName}...`)

      const client = new MongoClient(uri)
      await client.connect()

      this.client = client
      const db = client.db(dbName)
      logger.info(`Connected ${connectionName} to MongoDB ${dbName}`)

      return db
    } catch (error) {
      logger.error(`MongoDB ${connectionName} connection error:`, error)
      throw error
    }
  }

  disconnect = async (): Promise<void> => {
    const { connectionName } = this.opts
    if (this.client) {
      try {
        await this.client.close()
        logger.info(`MongoDB ${connectionName} connection closed.`)
      } catch (error) {
        logger.error(`Error closing MongoDB ${connectionName} connection:`, error)
      } finally {
        this.client = null
      }
    }
  }

  getDB = (): Db => {
    if (!this.client) {
      throw new Error(
        `Database not initialized for ${this.opts.connectionName}. Call connect() first.`
      )
    }
    return this.client.db(this.opts.mongodbDatabase)
  }

  getClient = (): MongoClient => {
    if (!this.client) {
      throw new Error(
        `Database not initialized for ${this.opts.connectionName}. Call connect() first.`
      )
    }
    return this.client
  }

  flushDB = async (): Promise<void> => {
    if (!this.client) {
      throw new Error(
        `Database not initialized for ${this.opts.connectionName}. Call connect() first.`
      )
    }
    const db = this.client.db(this.opts.mongodbDatabase)
    const collections = await db.collections()
    for (const collection of collections) {
      await collection.deleteMany({})
    }
    logger.info('Database flushed: all collections cleared.')
  }
}
