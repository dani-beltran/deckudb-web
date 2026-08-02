import MongoStore from 'connect-mongo'
import session from 'express-session'
import { getBackendConfig } from '../config'

const config = getBackendConfig()
const sessionSecrets = config.sessionSecret
const sessionMaxAgeMs = config.sessionMaxAgeMs

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
