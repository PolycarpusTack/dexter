interface LogData {
  [key: string]: any;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class LoggerService {
  private readonly isDevelopment: boolean;
  private readonly logPrefix = '[Dexter]';
  private logs: Array<{ level: LogLevel; message: string; data?: LogData; timestamp: string }> = [];
  private maxLogs = 1000;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `${this.logPrefix} [${level.toUpperCase()}] ${message}`;
  }

  private addToLogs(level: LogLevel, message: string, data?: LogData) {
    const logEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  debug(message: string, data?: LogData) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message), data || '');
    }
    this.addToLogs('debug', message, data);
  }

  info(message: string, data?: LogData) {
    console.info(this.formatMessage('info', message), data || '');
    this.addToLogs('info', message, data);
  }

  warn(message: string, data?: LogData) {
    console.warn(this.formatMessage('warn', message), data || '');
    this.addToLogs('warn', message, data);
  }

  error(message: string, data?: LogData) {
    console.error(this.formatMessage('error', message), data || '');
    this.addToLogs('error', message, data);
    
    // In production, you might want to send errors to a tracking service
    if (!this.isDevelopment && this.isErrorReportingEnabled()) {
      this.reportError(message, data);
    }
  }

  private isErrorReportingEnabled(): boolean {
    // Check if error reporting is enabled in environment
    return import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true';
  }

  private reportError(message: string, data?: LogData) {
    // This would integrate with an error reporting service like Sentry
    // For now, it's a placeholder
    try {
      // Actually use the message and data parameters to prepare for future implementation
      const errorPayload = {
        message,
        timestamp: new Date().toISOString(),
        level: 'error',
        extra: data || {}
      };
      
      // For future implementation:
      // window.Sentry?.captureMessage(message, { extra: data });
      console.debug('Error payload prepared for reporting:', errorPayload);
    } catch (e) {
      // Fail silently
    }
  }

  getLogs(level?: LogLevel, limit = 100) {
    let filteredLogs = this.logs;
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    return filteredLogs.slice(0, limit);
  }

  clearLogs() {
    this.logs = [];
  }

  downloadLogs() {
    const logsJson = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dexter-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const Logger = new LoggerService();
