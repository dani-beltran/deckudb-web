import type { IError } from './IError'

export class NotFoundError extends Error implements IError {
  statusCode: number

  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
    this.statusCode = 404
  }
}
