import { defineEventHandler, setResponseHeader } from 'h3'
import { getAdminIdentity, isAdminAuthenticated } from '../../../utils/admin-auth'
import { apiHandler } from '../../../utils/api'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    if (!isAdminAuthenticated(event)) return { authenticated: false }

    return { authenticated: true, username: getAdminIdentity(event) }
  })
)
