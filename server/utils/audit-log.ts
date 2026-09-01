import type { H3Event } from 'h3'
import {
  AUDIT_FAILURE_REASON,
  AUDIT_OUTCOME,
  type AuditContext,
  type AuditLog,
  type CreateAuditLogParams,
  sanitizeAuditContext,
} from '../models/audit-logs.schema'
import { getAdminIdentity } from './admin-auth'
import logger from './logger'

export type AuditFailure = Required<Pick<AuditContext, 'reason' | 'status_code'>>

export type RecordAuditLogParams = Omit<CreateAuditLogParams, 'user_identity'> & {
  user_identity?: string
}

export type AuditActionSuccessDetails = Partial<
  Pick<CreateAuditLogParams, 'target_resource' | 'target_id' | 'context'>
>

export type AuditActionDetails = Partial<
  Pick<RecordAuditLogParams, 'user_identity' | 'target_resource' | 'target_id' | 'context'>
>

export type AuditActionOptions<TResult> = Omit<RecordAuditLogParams, 'outcome'> & {
  /** Adds details that only become known after the operation succeeds, such as a new job ID. */
  resolveSuccess?: (result: TResult) => AuditActionSuccessDetails
}

function readErrorStatusCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return 500
  const statusCode = (error as { statusCode?: unknown }).statusCode
  return typeof statusCode === 'number' && Number.isInteger(statusCode) && statusCode >= 400
    ? Math.min(statusCode, 599)
    : 500
}

/** Maps errors to a small, non-sensitive set of failure details. */
export function classifyAuditFailure(error: unknown): AuditFailure {
  const status_code = readErrorStatusCode(error)
  let reason: AUDIT_FAILURE_REASON

  if (status_code === 401 || status_code === 403) {
    reason = AUDIT_FAILURE_REASON.UNAUTHORIZED
  } else if (status_code === 404) {
    reason = AUDIT_FAILURE_REASON.NOT_FOUND
  } else if (status_code === 409) {
    reason = AUDIT_FAILURE_REASON.CONFLICT
  } else if (status_code === 429) {
    reason = AUDIT_FAILURE_REASON.RATE_LIMITED
  } else if (status_code >= 400 && status_code < 500) {
    reason = AUDIT_FAILURE_REASON.INVALID_REQUEST
  } else {
    reason = AUDIT_FAILURE_REASON.INTERNAL_ERROR
  }

  return { reason, status_code }
}

function mergeAuditContext(...contexts: unknown[]) {
  const merged = Object.assign({}, ...contexts.filter(Boolean))
  return sanitizeAuditContext(merged)
}

/** Converts arbitrary attempted identities into the bounded value accepted by the audit schema. */
export function normalizeAuditIdentity(identity: unknown) {
  if (typeof identity !== 'string') return 'anonymous'
  const normalized = identity.trim()
  return normalized ? normalized.slice(0, 255) : 'anonymous'
}

/** Records a sanitized audit entry, defaulting to the current safe admin identity. */
export function recordAuditLog(event: H3Event, params: RecordAuditLogParams): Promise<AuditLog> {
  return event.context.repositories.auditLogs.recordAuditLog({
    ...params,
    user_identity: normalizeAuditIdentity(params.user_identity ?? getAdminIdentity(event)),
    context: sanitizeAuditContext(params.context),
  })
}

/**
 * Runs an action and attempts to persist one success/failure entry for its outcome.
 * The mutable details let handlers add an attempted username, target, or safe context after parsing.
 * Persistence failures fall back to the operational log without changing the action response.
 */
export async function withAuditLog<TResult>(
  event: H3Event,
  options: AuditActionOptions<TResult>,
  action: (details: AuditActionDetails) => Promise<TResult>
): Promise<TResult> {
  const { action_type, resolveSuccess, ...initialDetails } = options
  const details: AuditActionDetails = { ...initialDetails }
  const initialUserIdentity = normalizeAuditIdentity(
    initialDetails.user_identity ?? getAdminIdentity(event)
  )

  let result: TResult
  try {
    result = await action(details)
  } catch (error) {
    const auditEntry: RecordAuditLogParams = {
      ...details,
      action_type,
      user_identity: normalizeAuditIdentity(details.user_identity ?? initialUserIdentity),
      outcome: AUDIT_OUTCOME.FAILURE,
      context: mergeAuditContext(details.context, classifyAuditFailure(error)),
    }
    try {
      await recordAuditLog(event, auditEntry)
    } catch (auditError) {
      logger.error(
        'Failed to persist audit entry; retained in the operational log:',
        { audit_entry: auditEntry },
        auditError
      )
    }
    throw error
  }

  const successDetails = resolveSuccess?.(result)
  const auditEntry: RecordAuditLogParams = {
    ...details,
    ...successDetails,
    action_type,
    user_identity: normalizeAuditIdentity(details.user_identity ?? initialUserIdentity),
    outcome: AUDIT_OUTCOME.SUCCESS,
    context: mergeAuditContext(details.context, successDetails?.context),
  }
  try {
    await recordAuditLog(event, auditEntry)
  } catch (auditError) {
    logger.error(
      'Failed to persist audit entry; retained in the operational log:',
      { audit_entry: auditEntry },
      auditError
    )
  }
  return result
}
