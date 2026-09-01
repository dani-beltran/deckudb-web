import { defineEventHandler } from 'h3'
import z from 'zod/v4'
import {
  AUDIT_ACTION_TYPE,
  type AuditLog,
  type AuditLogFilters,
} from '../../models/audit-logs.schema'
import { apiHandler, parseQuery, requireAdmin } from '../../utils/api'
import { type PaginatedResult, paginationSchema } from '../../utils/pagination'

export type AuditLogsResponse = PaginatedResult<AuditLog>

function auditDateBoundarySchema(endOfDay: boolean) {
  return z
    .string()
    .trim()
    .transform((value, context) => {
      if (z.iso.date().safeParse(value).success) {
        return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
      }
      if (z.iso.datetime({ offset: true }).safeParse(value).success) return new Date(value)

      context.addIssue({ code: 'custom', message: 'Expected an ISO date or datetime' })
      return z.NEVER
    })
}

export const auditLogsQuerySchema = paginationSchema
  .extend({
    user_identity: z.string().trim().min(1).max(255).optional(),
    action_type: z.enum(AUDIT_ACTION_TYPE).optional(),
    date_from: auditDateBoundarySchema(false).optional(),
    date_to: auditDateBoundarySchema(true).optional(),
  })
  .superRefine(({ date_from, date_to }, context) => {
    if (date_from && date_to && date_from.getTime() > date_to.getTime()) {
      context.addIssue({
        code: 'custom',
        path: ['date_to'],
        message: 'date_to must be on or after date_from',
      })
    }
  })

export default defineEventHandler((event) =>
  apiHandler<AuditLogsResponse>(event, async () => {
    requireAdmin(event)
    const { user_identity, action_type, date_from, date_to, page, page_size } = await parseQuery(
      event,
      auditLogsQuerySchema
    )
    const filters: AuditLogFilters = { user_identity, action_type, date_from, date_to }
    return event.context.repositories.auditLogs.getAuditLogs(filters, { page, page_size })
  })
)
