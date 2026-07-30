import MongoStore from 'connect-mongo'
import session from 'express-session'
import {
  MONGODB_DATABASE,
  MONGODB_URI,
  NODE_ENV,
  NODE_ENVS,
  SESSION_MAX_AGE_MS,
  SESSION_SECRETS,
} from '../config/env'

const sessionMiddleware = session({
  name: 'decku.sid',
  secret: SESSION_SECRETS,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    dbName: MONGODB_DATABASE,
    collectionName: 'sessions',
    ttl: Math.floor(SESSION_MAX_AGE_MS / 1000),
    autoRemove: 'native',
  }),
  resave: false,
  saveUninitialized: true,
  rolling: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: NODE_ENV === NODE_ENVS.PRODUCTION,
    maxAge: SESSION_MAX_AGE_MS,
  },
})

export default sessionMiddleware
