import cors from 'cors'
import { getBackendConfig } from '../../config'

const { webHost } = getBackendConfig()

const corsMiddleware = cors({
  origin: [webHost, 'http://localhost:4173', 'http://localhost:5173'],
  credentials: true,
})

export default corsMiddleware
