export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface ILoggerService {
  /**
   * Log an error message
   */
  error(message: string, error?: Error): void;

  /**
   * Log a warning message
   */
  warn(message: string): void;

  /**
   * Log an info message
   */
  info(message: string): void;

  /**
   * Log a debug message
   */
  debug(message: string): void;

  /**
   * Set the current log level
   */
  setLogLevel(level: LogLevel): void;

  /**
   * Get the current log level
   */
  getLogLevel(): LogLevel;
}