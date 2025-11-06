import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

export interface LogConfig {
  level: LogLevel;
  enabledCategories: string[];
  disabledCategories: string[];
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredLogs: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private config: LogConfig;
  private storedLogs: any[] = [];

  constructor() {
    this.config = this.getLogConfig();
  }

  private getLogConfig(): LogConfig {
    if (environment.production) {
      return {
        level: LogLevel.WARN,
        enabledCategories: ['PWA-ERROR', 'AUTH', 'CRITICAL'],
        disabledCategories: [
          'HOME', 
          'SERVICE', 
          'PARCELA-SERVICE', 
          'PWA-RECOVERY', 
          'PWA-CACHE',
          'PWA-PERFORMANCE',
          'PWA-HEALTH'
        ],
        enableConsole: false,
        enableStorage: true,
        maxStoredLogs: 100
      };
    } else {
      return {
        level: LogLevel.DEBUG,
        enabledCategories: ['*'], // Todas as categorias
        disabledCategories: [
          'HOME', // Muito verboso em desenvolvimento
          'PWA-PERFORMANCE' // Logs de performance só quando necessário
        ],
        enableConsole: true,
        enableStorage: true,
        maxStoredLogs: 500
      };
    }
  }

  private shouldLog(level: LogLevel, category: string): boolean {
    // Verificar nível de log
    if (level > this.config.level) {
      return false;
    }

    // Verificar se categoria está desabilitada
    if (this.config.disabledCategories.includes(category)) {
      return false;
    }

    // Verificar se categoria está habilitada (ou se todas estão habilitadas)
    if (this.config.enabledCategories.includes('*') || 
        this.config.enabledCategories.includes(category)) {
      return true;
    }

    return false;
  }

  private formatMessage(level: string, category: string, message: string, emoji?: string): string {
    const timestamp = new Date().toISOString();
    const icon = emoji || this.getDefaultEmoji(level);
    return `${icon} [${category}] ${message}`;
  }

  private getDefaultEmoji(level: string): string {
    switch (level.toLowerCase()) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      case 'verbose': return '📝';
      default: return '📋';
    }
  }

  private storeLog(level: string, category: string, message: string, data?: any): void {
    if (!this.config.enableStorage) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? JSON.stringify(data) : undefined
    };

    this.storedLogs.push(logEntry);

    // Manter apenas os logs mais recentes
    if (this.storedLogs.length > this.config.maxStoredLogs) {
      this.storedLogs = this.storedLogs.slice(-this.config.maxStoredLogs);
    }

    // Salvar no localStorage para debug
    try {
      localStorage.setItem('app_logs', JSON.stringify(this.storedLogs.slice(-50)));
    } catch (error) {
      // Ignorar erros de storage
    }
  }

  error(category: string, message: string, data?: any, emoji?: string): void {
    if (!this.shouldLog(LogLevel.ERROR, category)) return;

    const formattedMessage = this.formatMessage('ERROR', category, message, emoji);
    
    if (this.config.enableConsole) {
      console.error(formattedMessage, data || '');
    }
    
    this.storeLog('ERROR', category, message, data);
  }

  warn(category: string, message: string, data?: any, emoji?: string): void {
    if (!this.shouldLog(LogLevel.WARN, category)) return;

    const formattedMessage = this.formatMessage('WARN', category, message, emoji);
    
    if (this.config.enableConsole) {
      console.warn(formattedMessage, data || '');
    }
    
    this.storeLog('WARN', category, message, data);
  }

  info(category: string, message: string, data?: any, emoji?: string): void {
    if (!this.shouldLog(LogLevel.INFO, category)) return;

    const formattedMessage = this.formatMessage('INFO', category, message, emoji);
    
    if (this.config.enableConsole) {
      console.log(formattedMessage, data || '');
    }
    
    this.storeLog('INFO', category, message, data);
  }

  debug(category: string, message: string, data?: any, emoji?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG, category)) return;

    const formattedMessage = this.formatMessage('DEBUG', category, message, emoji);
    
    if (this.config.enableConsole) {
      console.log(formattedMessage, data || '');
    }
    
    this.storeLog('DEBUG', category, message, data);
  }

  verbose(category: string, message: string, data?: any, emoji?: string): void {
    if (!this.shouldLog(LogLevel.VERBOSE, category)) return;

    const formattedMessage = this.formatMessage('VERBOSE', category, message, emoji);
    
    if (this.config.enableConsole) {
      console.log(formattedMessage, data || '');
    }
    
    this.storeLog('VERBOSE', category, message, data);
  }

  // Métodos de conveniência para categorias específicas
  pwaError(message: string, data?: any): void {
    this.error('PWA-ERROR', message, data, '🛡️');
  }

  pwaRecovery(message: string, data?: any): void {
    this.info('PWA-RECOVERY', message, data, '🔄');
  }

  service(message: string, data?: any): void {
    this.debug('SERVICE', message, data, '🚀');
  }

  home(message: string, data?: any): void {
    this.verbose('HOME', message, data, '🏠');
  }

  cache(message: string, data?: any): void {
    this.debug('CACHE', message, data, '💾');
  }

  auth(message: string, data?: any): void {
    this.info('AUTH', message, data, '🔐');
  }

  // Métodos utilitários
  getLogs(): any[] {
    return [...this.storedLogs];
  }

  getLogsByCategory(category: string): any[] {
    return this.storedLogs.filter(log => log.category === category);
  }

  clearLogs(): void {
    this.storedLogs = [];
    try {
      localStorage.removeItem('app_logs');
    } catch (error) {
      // Ignorar erros
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.storedLogs, null, 2);
  }

  // Configuração dinâmica
  updateConfig(newConfig: Partial<LogConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  enableCategory(category: string): void {
    const index = this.config.disabledCategories.indexOf(category);
    if (index > -1) {
      this.config.disabledCategories.splice(index, 1);
    }
    
    if (!this.config.enabledCategories.includes(category) && 
        !this.config.enabledCategories.includes('*')) {
      this.config.enabledCategories.push(category);
    }
  }

  disableCategory(category: string): void {
    if (!this.config.disabledCategories.includes(category)) {
      this.config.disabledCategories.push(category);
    }
    
    const index = this.config.enabledCategories.indexOf(category);
    if (index > -1) {
      this.config.enabledCategories.splice(index, 1);
    }
  }

  setLogLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getConfig(): LogConfig {
    return { ...this.config };
  }
}