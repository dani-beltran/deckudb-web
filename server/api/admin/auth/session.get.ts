import { defineEventHandler, setResponseHeader } from 'h3'
import { isAdminAuthenticated } from '../../../utils/admin-auth'
import { apiHandler } from '../../../utils/api'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    return { authenticated: isAdminAuthenticated(event) }
  })
)
