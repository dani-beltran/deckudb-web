import { defineNitroPlugin } from 'nitropack/runtime'
import { useStorage } from 'nitropack/runtime/internal/storage'
import mongodbDriver from 'unstorage/drivers/mongodb'
import { getServerConfig } from '../config'

/** Mounts MongoDB-backed session storage using deployment-time runtime configuration. */
export default defineNitroPlugin(() => {
  const { mongodbDatabase, mongodbUri } = getServerConfig()

  useStorage().mount(
    'mongo',
    mongodbDriver({
      connectionString: mongodbUri,
      databaseName: mongodbDatabase,
      collectionName: 'sessions',
    })
  )
})
