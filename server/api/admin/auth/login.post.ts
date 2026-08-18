import { defineEventHandler, setResponseHeader } from 'h3'
import z from 'zod'
import { authenticateAdmin, requireValidAdminCredentials } from '../../../utils/admin-auth'
import { apiHandler, parseBody } from '../../../utils/api'

const credentialsSchema = z.object({
  username: z.string(),
  password: z.string(),
})

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    const { username, password } = await parseBody(event, credentialsSchema)
    requireValidAdminCredentials(username, password)
    await authenticateAdmin(event)
    return { authenticated: true }
  })
)
