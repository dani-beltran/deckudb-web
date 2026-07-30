import { formatWithOptions } from 'node:util'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

// Tell winston about our colors
winston.addColors(colors)

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development'
  const isDevelopment = env === 'development'
  return isDevelopment ? 'debug' : 'info'
}

// Define format for console output (with colors)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
)

// Define format for file output (no colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
)

// Define transports (where to log)
const transports = [
  // Console transport with colors
  new winston.transports.Console({
    format: consoleFormat,
  }),
  // Rotating file transport for errors
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileFormat,
    maxSize: '20m', // Max size per file: 20MB
    maxFiles: '14d', // Keep logs for 14 days
    zippedArchive: true, // Compress archived logs
  }),
  // Rotating file transport for all logs
  new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    format: fileFormat,
    maxSize: '20m', // Max size per file: 20MB
    maxFiles: '14d', // Keep logs for 14 days
    zippedArchive: true, // Compress archived logs
  }),
]

// Create the logger
const baseLogger = winston.createLogger({
  level: level(),
  levels,
  transports,
})

type LogLevel = keyof typeof levels

const formatLogArgs = (args: unknown[]) => {
  if (args.length === 0) {
    return ''
  }

  return formatWithOptions(
    {
      colors: false,
      depth: null,
      maxArrayLength: null,
      maxStringLength: null,
    },
    ...args
  )
}

const originalLog = baseLogger.log.bind(baseLogger)

const logger = baseLogger as winston.Logger & {
  error: (...args: unknown[]) => winston.Logger
  warn: (...args: unknown[]) => winston.Logger
  info: (...args: unknown[]) => winston.Logger
  http: (...args: unknown[]) => winston.Logger
  debug: (...args: unknown[]) => winston.Logger
  log: (levelOrEntry: unknown, ...args: unknown[]) => winston.Logger
}

const logAtLevel = (logLevel: LogLevel, ...args: unknown[]) => {
  return originalLog(logLevel, formatLogArgs(args))
}

logger.error = (...args: unknown[]) => logAtLevel('error', ...args)
logger.warn = (...args: unknown[]) => logAtLevel('warn', ...args)
logger.info = (...args: unknown[]) => logAtLevel('info', ...args)
logger.http = (...args: unknown[]) => logAtLevel('http', ...args)
logger.debug = (...args: unknown[]) => logAtLevel('debug', ...args)
logger.log = (levelOrEntry: unknown, ...args: unknown[]) => {
  if (typeof levelOrEntry !== 'string') {
    return originalLog(levelOrEntry as never)
  }

  return originalLog(levelOrEntry, formatLogArgs(args))
}

export default logger
