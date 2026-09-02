import { randomUUID } from 'node:crypto'
import type { Db, Filter } from 'mongodb'
import type { Repository } from '../utils/bootstrap'
import type { PaginatedResult, PaginationParams } from '../utils/pagination'
import {
  type AuditLog,
  type AuditLogFilters,
  auditLogSchema,
  type CreateAuditLogParams,
  createAuditLogSchema,
  sanitizeAuditContext,
} from './audit-logs.schema'
import { getServerConfig } from '../config'

export const AUDIT_LOGS_COLLECTION = 'audit-logs'
const { auditLogRetentionDays } = getServerConfig()

/** Append-only repository used to record and inspect dashboard audit events. */
export class AuditLogsModel implements Repository {
  constructor(private readonly db: Db) {}

  /** Creates an audit entry; IDs and timestamps are always owned by the repository. */
  recordAuditLog = async (params: CreateAuditLogParams): Promise<AuditLog> => {
    const { context: unsafeContext, ...details } = params
    const context = sanitizeAuditContext(unsafeContext)
    const validatedDetails = createAuditLogSchema.parse({
      ...details,
      ...(context ? { context } : {}),
    })
    const auditLog = auditLogSchema.parse({
      ...validatedDetails,
      created_at: new Date(),
      audit_id: randomUUID(),
    })

    // Insert a copy so the MongoDB driver cannot attach its internal `_id` to the public result.
    await this.db.collection<AuditLog>(AUDIT_LOGS_COLLECTION).insertOne({ ...auditLog })
    return auditLog
  }

  /** Returns an immutable, newest-first view with exact identity/action matching. */
  getAuditLogs = async (
    filters: AuditLogFilters = {},
    pagination?: PaginationParams
  ): Promise<PaginatedResult<AuditLog>> => {
    const { page = 1, page_size = 20 } = pagination ?? {}
    const mongoFilters: Filter<AuditLog> = {}

    if (filters.user_identity !== undefined) {
      mongoFilters.user_identity = filters.user_identity
    }
    if (filters.action_type !== undefined) {
      mongoFilters.action_type = filters.action_type
    }
    if (filters.date_from !== undefined || filters.date_to !== undefined) {
      mongoFilters.created_at = {
        ...(filters.date_from ? { $gte: filters.date_from } : {}),
        ...(filters.date_to ? { $lte: filters.date_to } : {}),
      }
    }

    const collection = this.db.collection<AuditLog>(AUDIT_LOGS_COLLECTION)
    const skip = (page - 1) * page_size
    const [items, total] = await Promise.all([
      collection
        .find(mongoFilters, { projection: { _id: 0 } })
        .sort({ created_at: -1, audit_id: -1 })
        .skip(skip)
        .limit(page_size)
        .toArray(),
      collection.countDocuments(mongoFilters),
    ])

    return {
      items,
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    }
  }

  createIndexes = async () => {
    const collection = this.db.collection<AuditLog>(AUDIT_LOGS_COLLECTION)
    await collection.createIndex({ audit_id: 1 }, { unique: true })
    await collection.createIndex({ created_at: 1 }, { expireAfterSeconds: auditLogRetentionDays * 24 * 60 * 60 })
    await collection.createIndex({ created_at: -1, audit_id: -1 })
    await collection.createIndex({ user_identity: 1, created_at: -1, audit_id: -1 })
    await collection.createIndex({ action_type: 1, created_at: -1, audit_id: -1 })
    await collection.createIndex({
      user_identity: 1,
      action_type: 1,
      created_at: -1,
      audit_id: -1,
    })
  }
}
