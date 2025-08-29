const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'migration-service' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),
    
    // Daily rotate file transport for general logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    
    // Daily rotate file transport for error logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    })
  ]
});

// Create a specialized logger for migration jobs
const createJobLogger = (jobId) => {
  return winston.createLogger({
    level: 'debug',
    format: logFormat,
    defaultMeta: { 
      service: 'migration-service',
      jobId: jobId
    },
    transports: [
      // Job-specific log file
      new DailyRotateFile({
        filename: path.join(logsDir, `job-${jobId}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '50m',
        maxFiles: '7d',
        level: 'debug'
      }),
      
      // Console for development
      ...(process.env.NODE_ENV !== 'production' ? [
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug'
        })
      ] : [])
    ]
  });
};

// Utility functions for structured logging
const logMigrationEvent = (jobId, event, details = {}) => {
  const jobLogger = createJobLogger(jobId);
  jobLogger.info(`Migration ${event}`, {
    event,
    jobId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

const logMigrationError = (jobId, error, context = {}) => {
  const jobLogger = createJobLogger(jobId);
  jobLogger.error(`Migration error: ${error.message}`, {
    error: error.message,
    stack: error.stack,
    jobId,
    timestamp: new Date().toISOString(),
    ...context
  });
};

const logMigrationProgress = (jobId, progress, details = {}) => {
  const jobLogger = createJobLogger(jobId);
  jobLogger.info(`Migration progress: ${progress}%`, {
    progress,
    jobId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

module.exports = {
  logger,
  createJobLogger,
  logMigrationEvent,
  logMigrationError,
  logMigrationProgress
};

