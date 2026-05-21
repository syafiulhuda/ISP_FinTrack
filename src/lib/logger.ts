type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  context?: Record<string, any>;
  error?: Error | unknown;
  path?: string;
  user_id?: string;
}

class CentralLogger {
  private formatLog(level: LogLevel, payload: LogPayload) {
    const timestamp = new Date().toISOString();
    
    // Extract error details if present
    let errorDetails = undefined;
    if (payload.error) {
      if (payload.error instanceof Error) {
        errorDetails = {
          name: payload.error.name,
          message: payload.error.message,
          stack: payload.error.stack,
        };
      } else {
        errorDetails = payload.error;
      }
    }

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message: payload.message,
      path: payload.path || 'unknown',
      context: payload.context,
      error: errorDetails,
      user_id: payload.user_id,
      environment: process.env.NODE_ENV || 'development'
    };

    // In production, stringify as a single line JSON for Vercel Logs
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(logEntry);
    }
    
    // In development, return a nicely formatted object
    return logEntry;
  }

  info(payload: LogPayload) {
    const log = this.formatLog('info', payload);
    if (process.env.NODE_ENV === 'production') {
      console.log(log);
    } else {
      console.log(`[INFO] ${payload.message}`, log);
    }
  }

  warn(payload: LogPayload) {
    const log = this.formatLog('warn', payload);
    if (process.env.NODE_ENV === 'production') {
      console.warn(log);
    } else {
      console.warn(`[WARN] ${payload.message}`, log);
    }
  }

  error(payload: LogPayload) {
    const log = this.formatLog('error', payload);
    if (process.env.NODE_ENV === 'production') {
      console.error(log);
    } else {
      console.error(`[ERROR] ${payload.message}`, log);
    }
  }

  debug(payload: LogPayload) {
    if (process.env.NODE_ENV !== 'production') {
      const log = this.formatLog('debug', payload);
      console.debug(`[DEBUG] ${payload.message}`, log);
    }
  }
}

export const logger = new CentralLogger();
