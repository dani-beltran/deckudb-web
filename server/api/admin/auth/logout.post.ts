import { defineEventHandler, setResponseHeader } from 'h3'
import { AUDIT_ACTION_TYPE } from '../../../models/audit-logs.schema'
import { isAdminAuthenticated, logoutAdmin } from '../../../utils/admin-auth'
import { apiHandler } from '../../../utils/api'
import { withAuditLog } from '../../../utils/audit-log'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    setResponseHeader(event, 'Cache-Control', 'no-store')

    // Keep logout idempotent and clear invalid cookies without treating a no-session request as
    // an administrator action. Authenticated attempts are audited, including storage failures.
    if (!isAdminAuthenticated(event)) {
      await logoutAdmin(event)
      return { authenticated: false }
    }

    return withAuditLog(event, { action_type: AUDIT_ACTION_TYPE.LOGOUT }, async () => {
      await logoutAdmin(event)
      return { authenticated: false }
    })
  })
)
