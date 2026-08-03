import { defineEventHandler } from 'h3'

export default defineEventHandler(() => ({ status: 'OK', message: 'API is running' }))
