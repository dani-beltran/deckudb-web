import { type Db, MongoClient } from 'mongodb'
import { useRuntimeConfig } from '#imports'
import logger from './logger'

let db: Db | null = null
let mongoClient: MongoClient | null = null

export const connectDB = async (): Promise<Db> => {
  try {
    const { mongodbDatabase: dbName, mongodbUri: uri } = useRuntimeConfig()

    logger.info('Connecting to MongoDB...')

    const client = new MongoClient(uri)
    await client.connect()

    mongoClient = client
    db = client.db(dbName)
    logger.info(`Connected to MongoDB database: ${dbName}`)

    return db
  } catch (error) {
    logger.error('MongoDB connection error:', error)
    throw error
  }
}

export const getDB = (): Db => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.')
  }
  return db
}

export const getClient = (): MongoClient => {
  if (!mongoClient) {
    throw new Error('Database not initialized. Call connectDB first.')
  }
  return mongoClient
}
