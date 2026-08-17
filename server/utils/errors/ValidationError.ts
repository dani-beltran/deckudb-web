import type { ZodError } from 'zod'
import type { IError } from './IError'

export class ValidationError extends Error implements IError {
  statusCode: number
  details: { field: string; message: string }[]

  constructor(message: string, error?: ZodError) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = 400
    this.details =
      error?.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })) || []
  }
}
