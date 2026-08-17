import { MongoMemoryServer } from 'mongodb-memory-server'

const restoreEnv = (name: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

/** Starts one MongoDB instance shared by the API and e2e Vitest projects. */
export default async function setup() {
  const previousEnv = {
    mongodbUri: process.env.MONGODB_URI,
    nuxtMongodbUri: process.env.NUXT_MONGODB_URI,
  }
  const mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()

  process.env.MONGODB_URI = uri
  process.env.NUXT_MONGODB_URI = uri

  return async () => {
    await mongoServer.stop()
    restoreEnv('MONGODB_URI', previousEnv.mongodbUri)
    restoreEnv('NUXT_MONGODB_URI', previousEnv.nuxtMongodbUri)
  }
}
