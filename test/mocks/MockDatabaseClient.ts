import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";

export class MockMongoClient {
  private dbInstance: Db | null = null;
  private client: MongoClient | null = null;

  constructor() {
    this.dbInstance = null;
  }

  async connect() {
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    this.client = await MongoClient.connect(uri);
    this.dbInstance = this.client.db('test');
    return this.dbInstance;
  }

  disconnect() {
    if (this.client) {
      this.client.close();
    }
  }

  getDB() {
    if (!this.dbInstance) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.dbInstance;
  }

  getClient() {
    if (!this.client) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.client;
  }

  flushDB = async () => {
    if (!this.dbInstance) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    const collections = await this.dbInstance.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  };
}