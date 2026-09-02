import { randomUUID } from 'node:crypto'
import {
  AUDIT_ACTION_TYPE,
  AUDIT_OUTCOME,
  AUDIT_TARGET_RESOURCE,
  auditLogSchema,
  createAuditLogSchema,
} from '@server/models/audit-logs.schema'
import { describe, expect, it } from 'vitest'

const baseAuditLog = {
  user_identity: 'admin',
  outcome: AUDIT_OUTCOME.SUCCESS,
}

const schemas = [
  {
    name: 'createAuditLogSchema',
    schema: createAuditLogSchema,
    storedFields: {},
  },
  {
    name: 'auditLogSchema',
    schema: auditLogSchema,
    storedFields: {
      audit_id: randomUUID(),
      created_at: new Date('2026-09-02T10:00:00.000Z'),
    },
  },
]

describe.each(schemas)('$name', ({ schema, storedFields }) => {
  const parse = (entry: Record<string, unknown>) =>
    schema.safeParse({ ...baseAuditLog, ...storedFields, ...entry })

  it.each([AUDIT_ACTION_TYPE.JOB_RUN, AUDIT_ACTION_TYPE.JOB_DELETE])(
    'accepts %s with a job target and ID',
    (action_type) => {
      expect(
        parse({
          action_type,
          target_resource: AUDIT_TARGET_RESOURCE.JOB,
          target_id: randomUUID(),
        }).success
      ).toBe(true)
    }
  )

  it.each([AUDIT_ACTION_TYPE.JOB_RUN])(
    'rejects %s without a job target resource',
    (action_type) => {
      expect(parse({ action_type }).success).toBe(false)
    }
  )

  it.each([AUDIT_ACTION_TYPE.JOB_DELETE])(
    'rejects %s without a complete job target',
    (action_type) => {
      expect(parse({ action_type }).success).toBe(false)
      expect(parse({ action_type, target_resource: AUDIT_TARGET_RESOURCE.JOB }).success).toBe(false)
      expect(parse({ action_type, target_id: randomUUID() }).success).toBe(false)
    }
  )

  it.each([AUDIT_ACTION_TYPE.LOGIN, AUDIT_ACTION_TYPE.LOGOUT])(
    'accepts target-free %s entries',
    (action_type) => {
      expect(parse({ action_type }).success).toBe(true)
    }
  )

  it.each([AUDIT_ACTION_TYPE.LOGIN, AUDIT_ACTION_TYPE.LOGOUT])(
    'rejects targets on %s entries',
    (action_type) => {
      expect(parse({ action_type, target_resource: AUDIT_TARGET_RESOURCE.JOB }).success).toBe(false)
      expect(parse({ action_type, target_id: randomUUID() }).success).toBe(false)
      expect(
        parse({
          action_type,
          target_resource: AUDIT_TARGET_RESOURCE.JOB,
          target_id: randomUUID(),
        }).success
      ).toBe(false)
    }
  )
})
