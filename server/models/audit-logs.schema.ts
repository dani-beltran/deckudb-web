import z from 'zod/v4'
import { JOB_TYPE } from './jobs.schema'

export const AUDIT_ACTION_TYPE = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  JOB_RUN: 'job_run',
  JOB_DELETE: 'job_delete',
} as const
export type AUDIT_ACTION_TYPE = (typeof AUDIT_ACTION_TYPE)[keyof typeof AUDIT_ACTION_TYPE]

export const AUDIT_OUTCOME = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const
export type AUDIT_OUTCOME = (typeof AUDIT_OUTCOME)[keyof typeof AUDIT_OUTCOME]

export const AUDIT_TARGET_RESOURCE = { JOB: 'job' } as const
export type AUDIT_TARGET_RESOURCE =
  (typeof AUDIT_TARGET_RESOURCE)[keyof typeof AUDIT_TARGET_RESOURCE]

/** Deliberately coarse reasons prevent raw error messages from reaching the audit trail. */
export const AUDIT_FAILURE_REASON = {
  UNAUTHORIZED: 'unauthorized',
  INVALID_REQUEST: 'invalid_request',
  RATE_LIMITED: 'rate_limited',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  INTERNAL_ERROR: 'internal_error',
} as const
export type AUDIT_FAILURE_REASON = (typeof AUDIT_FAILURE_REASON)[keyof typeof AUDIT_FAILURE_REASON]

export const auditContextSchema = z.strictObject({
  game_id: z.number().int().positive().optional(),
  game_name: z.string().trim().min(1).max(255).optional(),
  job_type: z.enum(JOB_TYPE).optional(),
  reason: z.enum(AUDIT_FAILURE_REASON).optional(),
  status_code: z.number().int().min(100).max(599).optional(),
})

const auditLogInputShape = {
  user_identity: z.string().trim().min(1).max(255),
  action_type: z.enum(AUDIT_ACTION_TYPE),
  target_resource: z.enum(AUDIT_TARGET_RESOURCE).optional(),
  target_id: z.string().trim().min(1).max(255).optional(),
  outcome: z.enum(AUDIT_OUTCOME),
  context: auditContextSchema.optional(),
}

type AuditTargetInput = {
  action_type: AUDIT_ACTION_TYPE
  target_resource?: AUDIT_TARGET_RESOURCE
  target_id?: string
}

function enforceAuditTargetInvariant(auditLog: AuditTargetInput, context: z.RefinementCtx) {
  const isJobAction =
    auditLog.action_type === AUDIT_ACTION_TYPE.JOB_RUN ||
    auditLog.action_type === AUDIT_ACTION_TYPE.JOB_DELETE
  const isCreateJobAction =
    auditLog.action_type === AUDIT_ACTION_TYPE.JOB_RUN

  if (isJobAction) {
    if (auditLog.target_resource !== AUDIT_TARGET_RESOURCE.JOB) {
      context.addIssue({
        code: 'custom',
        path: ['target_resource'],
        message: 'Job audit actions must target a job',
      })
    }
    if (auditLog.target_id === undefined && !isCreateJobAction) {
      context.addIssue({
        code: 'custom',
        path: ['target_id'],
        message: 'Job audit actions must include a target ID',
      })
    }
    return
  }

  const isAuthAction = 
    auditLog.action_type === AUDIT_ACTION_TYPE.LOGIN ||
    auditLog.action_type === AUDIT_ACTION_TYPE.LOGOUT

  if (isAuthAction) {
    if (auditLog.target_resource !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['target_resource'],
        message: 'Authentication audit actions cannot include a target resource',
      })
    }
    if (auditLog.target_id !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['target_id'],
        message: 'Authentication audit actions cannot include a target ID',
      })
    }
  }
}

export const createAuditLogSchema = z
  .strictObject(auditLogInputShape)
  .superRefine(enforceAuditTargetInvariant)

export const auditLogSchema = z
  .strictObject({
    created_at: z.date(),
    audit_id: z.uuid({ version: 'v4' }),
    ...auditLogInputShape,
  })
  .superRefine(enforceAuditTargetInvariant)

export type AuditContext = z.infer<typeof auditContextSchema>
export type CreateAuditLogParams = z.infer<typeof createAuditLogSchema>
export type AuditLog = z.infer<typeof auditLogSchema>

export type AuditLogFilters = Partial<
  Pick<AuditLog, 'user_identity' | 'action_type'> & {
    date_from: Date
    date_to: Date
  }
>

const allowedContextKeys = [
  'game_id',
  'game_name',
  'job_type',
  'reason',
  'status_code',
] as const satisfies readonly (keyof AuditContext)[]

/**
 * Builds audit context exclusively from the public allow-list.
 * Unknown keys (including credentials, tokens, and request bodies) are never persisted.
 */
export function sanitizeAuditContext(context: unknown): AuditContext | undefined {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return

  const source = context as Record<string, unknown>
  const sanitized: Record<string, unknown> = {}
  for (const key of allowedContextKeys) {
    if (source[key] !== undefined) sanitized[key] = source[key]
  }

  if (typeof sanitized.game_name === 'string') {
    sanitized.game_name = sanitized.game_name.trim().slice(0, 255)
  }

  if (Object.keys(sanitized).length === 0) return
  const result = auditContextSchema.safeParse(sanitized)
  return result.success ? result.data : undefined
}
