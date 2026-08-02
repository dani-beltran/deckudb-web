import type { RequestHandler } from 'express'
import { ZodError, type ZodType } from 'zod'
import logger from '../lib/logger'

// Specific validator for params only
export const validateParams = (schema: ZodType): RequestHandler => {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.params)
      // biome-ignore lint/suspicious/noExplicitAny: too complex to solve for the scope of this project
      req.params = validated as any
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))

        res.status(400).json({
          error: 'Invalid request parameters',
          details: errorMessages,
        })
      } else {
        logger.error('Unexpected error in validation', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
}

// Specific validator for query only
export const validateQuery = (schema: ZodType): RequestHandler => {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.query)
      // biome-ignore lint/suspicious/noExplicitAny: too complex to solve for the scope of this project
      req.query = validated as any
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))

        res.status(400).json({
          error: 'Invalid query parameters',
          details: errorMessages,
        })
      } else {
        logger.error('Unexpected error in validation', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
}

export const validateBody = (schema: ZodType): RequestHandler => {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.body)
      // biome-ignore lint/suspicious/noExplicitAny: too complex to solve for the scope of this project
      req.body = validated as any
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))

        res.status(400).json({
          error: 'Invalid request body',
          details: errorMessages,
        })
      } else {
        logger.error('Unexpected error in validation', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
}
