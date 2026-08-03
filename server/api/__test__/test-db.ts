import { type Db, MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

/**
 * Create an in-memory database, connect to it and return it.
 */
export const createTestDb = async () => {
  const mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()

  const connection = await MongoClient.connect(uri)
  const db = connection.db('test')

  return {
    db,
    connection,
    mongoServer,
  }
}

/**
 * Remove the test database, close the connection and stop the in-memory server.
 * @param db
 * @param mongoServer
 */
export const removeTestDb = async (db: Db, mongoServer: MongoMemoryServer) => {
  if (db) {
    await db.dropDatabase()
    await db.client.close()
  }
  if (mongoServer) {
    await mongoServer.stop()
  }
}

/**
 * Remove all data from collections
 */
export const flushDB = async (db: Db) => {
  if (db) {
    const collections = await db.collections()
    for (const collection of collections) {
      await collection.deleteMany({})
    }
  }
}
