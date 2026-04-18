import winston from 'winston';
import 'winston-daily-rotate-file';

const fileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    ({ level, message, timestamp }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`
  )
);

export const logger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new winston.transports.Console(),
    fileTransport
  ]
});
