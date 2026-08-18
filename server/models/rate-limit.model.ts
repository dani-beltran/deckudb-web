import type { Db } from 'mongodb'
import type { Repository } from '../utils/bootstrap'

const RATE_LIMIT_COLLECTION = 'rate_limits'

type RateLimitDocument = {
  _id: string
  expires_at: Date
  last_request_allowed: boolean
  request_times: Date[]
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetSeconds: number
}

type ConsumeRateLimitOptions = {
  limit: number
  now?: Date
  windowMs: number
}

/**
 * MongoDB-backed sliding-window rate limiter.
 *
 * The update pipeline removes expired timestamps and conditionally appends the current request in
 * one atomic operation. Rejected requests are not appended, keeping each document bounded by the
 * configured limit even when a client continues sending traffic after exhausting its quota.
 */
export class RateLimitModel implements Repository {
  constructor(private readonly db: Db) {}

  async consume(
    partitionKey: string,
    { limit, now = new Date(), windowMs }: ConsumeRateLimitOptions
  ): Promise<RateLimitResult> {
    const cutoff = new Date(now.getTime() - windowMs)
    const expiresAt = new Date(now.getTime() + windowMs)

    const document = await this.db
      .collection<RateLimitDocument>(RATE_LIMIT_COLLECTION)
      .findOneAndUpdate(
        { _id: partitionKey },
        [
          {
            $set: {
              request_times: {
                $filter: {
                  input: { $ifNull: ['$request_times', []] },
                  as: 'request_time',
                  cond: { $gt: ['$$request_time', cutoff] },
                },
              },
            },
          },
          {
            $set: {
              last_request_allowed: { $lt: [{ $size: '$request_times' }, limit] },
            },
          },
          {
            $set: {
              expires_at: expiresAt,
              request_times: {
                $cond: [
                  '$last_request_allowed',
                  { $concatArrays: ['$request_times', [now]] },
                  '$request_times',
                ],
              },
            },
          },
        ],
        { returnDocument: 'after', upsert: true }
      )

    if (!document) throw new Error('Rate limit counter update did not return a document')

    const oldestRequest = document.request_times[0] ?? now
    return {
      allowed: document.last_request_allowed,
      remaining: Math.max(0, limit - document.request_times.length),
      resetSeconds: Math.max(
        1,
        Math.ceil((oldestRequest.getTime() + windowMs - now.getTime()) / 1000)
      ),
    }
  }

  createIndexes = async () => {
    await this.db
      .collection<RateLimitDocument>(RATE_LIMIT_COLLECTION)
      .createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
  }
}
