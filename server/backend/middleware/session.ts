import MongoStore from 'connect-mongo'
import session from 'express-session'
import { useRuntimeConfig } from '#imports'

const config = useRuntimeConfig()
const sessionSecrets = config.sessionSecret
  .split(',')
  .map((secret) => secret.trim())
  .filter(Boolean)
const sessionMaxAgeMs = Number.parseInt(config.sessionMaxAgeMs, 10)

if (sessionSecrets.length === 0) {
  throw new Error('sessionSecret runtime config must contain at least one non-empty secret.')
}

const sessionMiddleware = session({
  name: 'decku.sid',
  secret: sessionSecrets,
  store: MongoStore.create({
    mongoUrl: config.mongodbUri,
    dbName: config.mongodbDatabase,
    collectionName: 'sessions',
    ttl: Math.floor(sessionMaxAgeMs / 1000),
    autoRemove: 'native',
  }),
  resave: false,
  saveUninitialized: true,
  rolling: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: sessionMaxAgeMs,
  },
})

export default sessionMiddleware
