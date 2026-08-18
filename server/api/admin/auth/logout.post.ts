import { defineEventHandler, setResponseHeader } from 'h3'
import { logoutAdmin } from '../../../utils/admin-auth'
import { apiHandler } from '../../../utils/api'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    await logoutAdmin(event)
    return { authenticated: false }
  })
)
