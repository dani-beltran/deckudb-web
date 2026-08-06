import z from "zod/v4"
import { gameIdSchema } from "./games.schema"

export enum JOB_TYPE {
  SCRAPE = 'scrape',
  REPORTS = 'reports',
  SUMMARY = 'summary',
  SEARCH = 'search',
  FULL = 'full',
}

export enum JOB_STATUS {
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const jobSchema = z.object({
  job_id: z.string(),
  job_type: z.enum(JOB_TYPE),
  game_id: gameIdSchema,
  game_name: z.string().optional(),
  status: z.enum(JOB_STATUS),
  attempt_count: z.number().int().nonnegative().optional(),
  max_attempts: z.number().int().positive().optional(),
  started_at: z.date().nullable(),
  completed_at: z.date().nullable(),
  status_message: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
})

export const createJobSchema = z.object({
  job_type: z.enum(JOB_TYPE),
  game_id: gameIdSchema,
  game_name: z.string().optional(),
  max_attempts: z.number().int().positive().optional(),
})

export type Job = z.infer<typeof jobSchema>
export type CreateJobParams = z.infer<typeof createJobSchema>