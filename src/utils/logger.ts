/**
 * Frontend logger utility
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = import.meta.env?.DEV ?? true;

  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // Always log errors
    if (level === 'error') {
      console.error(prefix, message, ...args);
      return;
    }

    // Log warnings in all environments
    if (level === 'warn') {
      console.warn(prefix, message, ...args);
      return;
    }

    // Only log debug and info in development
    if (this.isDevelopment) {
      if (level === 'debug') {
        console.debug(prefix, message, ...args);
      } else {
        console.log(prefix, message, ...args);
      }
    }
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }
}

export const logger = new Logger();
