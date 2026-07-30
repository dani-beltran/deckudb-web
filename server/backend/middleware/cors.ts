import cors from 'cors'
import { WEB_HOST } from '../config/env'

const corsMiddleware = cors({
  origin: [WEB_HOST, 'http://localhost:4173', 'http://localhost:5173'],
  credentials: true,
})

export default corsMiddleware
