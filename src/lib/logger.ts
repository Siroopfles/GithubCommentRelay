import winston from 'winston';
import 'winston-daily-rotate-file';

const fileTransport = new winston.transports.DailyRotateFile({
  filename: `${process.env.LOG_DIR ?? 'logs'}/${process.env.ROLE ?? 'app'}-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

const format = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => {
      const { level, message, timestamp, stack, ...rest } = info as any;
      const splat = (info as any)[Symbol.for('splat')] as unknown[] | undefined;
      const extras = splat && splat.length
        ? ' ' + splat.map(s => s instanceof Error ? (s.stack ?? s.message) : JSON.stringify(s)).join(' ')
        : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${stack ?? message}${extras}`;
    }
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
