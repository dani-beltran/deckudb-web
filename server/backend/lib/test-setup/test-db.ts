import { type Db, MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer: MongoMemoryServer
let connection: MongoClient
let db: Db

/**
 * Connect to the in-memory database
 */
export const connectTestDB = async (): Promise<Db> => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()

  connection = await MongoClient.connect(uri)
  db = connection.db('test')

  return db
}

/**
 * Drop database, close the connection and stop mongod
 */
export const closeTestDB = async () => {
  if (connection) {
    await connection.close()
  }
  if (mongoServer) {
    await mongoServer.stop()
  }
}

/**
 * Remove all data from collections
 */
export const clearTestDB = async () => {
  if (db) {
    const collections = await db.collections()
    for (const collection of collections) {
      await collection.deleteMany({})
    }
  }
}

/**
 * Get the database instance
 */
export const getTestDB = (): Db => {
  if (!db) {
    throw new Error('Database not initialized. Call connect first.')
  }
  return db
}
