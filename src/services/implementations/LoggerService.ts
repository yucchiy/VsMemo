import { ILoggerService, LogLevel } from '../interfaces/ILoggerService';

export class LoggerService implements ILoggerService {
  private currentLogLevel: LogLevel = LogLevel.INFO;
  private readonly prefix = '[VsMemo]';

  constructor(logLevel?: LogLevel) {
    if (logLevel !== undefined) {
      this.currentLogLevel = logLevel;
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      if (error) {
        console.error(`${this.prefix} ERROR: ${message}`, error);
      } else {
        console.error(`${this.prefix} ERROR: ${message}`);
      }
    }
  }

  warn(message: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`${this.prefix} WARN: ${message}`);
    }
  }

  info(message: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`${this.prefix} INFO: ${message}`);
    }
  }

  debug(message: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`${this.prefix} DEBUG: ${message}`);
    }
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.currentLogLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLogLevel;
  }
}