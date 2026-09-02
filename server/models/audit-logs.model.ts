import { randomUUID } from 'node:crypto'
import type { Collection, Db, Filter } from 'mongodb'
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

/** Append-only repository used to record and inspect dashboard audit events. */
export class AuditLogsModel implements Repository {
  collection: Collection<AuditLog>

  constructor(
    private readonly db: Db,
    private readonly retentionDays: number
  ) {
    this.collection = this.db.collection<AuditLog>('audit-logs')
  }

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
    await this.collection.insertOne({ ...auditLog })
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

    const skip = (page - 1) * page_size
    const [items, total] = await Promise.all([
      this.collection
        .find(mongoFilters, { projection: { _id: 0 } })
        .sort({ created_at: -1, audit_id: -1 })
        .skip(skip)
        .limit(page_size)
        .toArray(),
      this.collection.countDocuments(mongoFilters),
    ])

    return {
      items,
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    }
  }

  /**
   * Inserts audit logs directly into the database for testing purposes.
   * This bypasses generated IDs and timestamps so tests can set up exact audit-log fixtures.
   */
  insertTestAuditLogs = async (auditLogs: AuditLog[]) => {
    await this.collection.insertMany(auditLogs)
  }

  createIndexes = async () => {
    await this.collection.createIndex({ audit_id: 1 }, { unique: true })
    await this.collection.createIndex({ created_at: -1, audit_id: -1 })
    await this.collection.createIndex({ user_identity: 1, created_at: -1, audit_id: -1 })
    await this.collection.createIndex({ action_type: 1, created_at: -1, audit_id: -1 })
    await this.collection.createIndex({
      user_identity: 1,
      action_type: 1,
      created_at: -1,
      audit_id: -1,
    })
    this.ensureTTLIndex()
  }

  /**
   * Creates or Updates the TLL index securely.
   */
  private ensureTTLIndex = async () => {
    const AUDIT_TTL_INDEX_NAME = 'audit_logs_created_at_ttl'
    const expireAfterSeconds = this.retentionDays * 24 * 60 * 60

    const indexes = await this.collection.listIndexes().toArray()
    const existing = indexes.find((index) => index.name === AUDIT_TTL_INDEX_NAME)

    if (!existing) {
      await this.collection.createIndex(
        { created_at: 1 },
        {
          name: AUDIT_TTL_INDEX_NAME,
          expireAfterSeconds,
        }
      )
      return
    }

    if (Number(existing.expireAfterSeconds) !== expireAfterSeconds) {
      await this.db.command({
        collMod: this.collection.collectionName,
        index: {
          keyPattern: { created_at: 1 },
          expireAfterSeconds,
        },
      })
    }
  }
}
