import type { IError } from './IError'

export class ConflictError extends Error implements IError {
  statusCode: number

  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
    this.statusCode = 409
  }
}
