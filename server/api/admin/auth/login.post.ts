import { defineEventHandler, setResponseHeader } from 'h3'
import z from 'zod'
import { AUDIT_ACTION_TYPE } from '../../../models/audit-logs.schema'
import { authenticateAdmin, requireValidAdminCredentials } from '../../../utils/admin-auth'
import { apiHandler, parseBody } from '../../../utils/api'
import { withAuditLog } from '../../../utils/audit-log'

const credentialsSchema = z.object({
  username: z.string().max(255),
  password: z.string().max(255),
})

export default defineEventHandler((event) =>
  apiHandler(event, () =>
    withAuditLog(event, { action_type: AUDIT_ACTION_TYPE.LOGIN }, async (audit) => {
      setResponseHeader(event, 'Cache-Control', 'no-store')
      const { username, password } = await parseBody(event, credentialsSchema, (body) =>
        populateAuditUserIdentity(audit, body)
      )
      requireValidAdminCredentials(username, password)
      await authenticateAdmin(event, username)
      return { authenticated: true, username }
    })
  )
)

function populateAuditUserIdentity(audit: { user_identity?: string }, body: unknown) {
  if (body && typeof body === 'object' && 'username' in body) {
    const attemptedUsername = body.username
    if (typeof attemptedUsername === 'string') audit.user_identity = attemptedUsername
  }
}
