/**
 * Frontend logger utility
 */

import { isDev } from './env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = isDev();
  private forceLogging = true; // Force all logs in production for debugging

  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    // Use emoji for better visibility
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level];

    // Always log errors
    if (level === 'error') {
      console.error(`${emoji} ${prefix}`, message, ...args);
      return;
    }

    // Log warnings in all environments
    if (level === 'warn') {
      console.warn(`${emoji} ${prefix}`, message, ...args);
      return;
    }

    // Force logging in production if enabled OR in development
    if (this.forceLogging || this.isDevelopment) {
      if (level === 'debug') {
        console.debug(`${emoji} ${prefix}`, message, ...args);
      } else {
        console.log(`${emoji} ${prefix}`, message, ...args);
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
