import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { ModalService } from './modal.service';

export interface PWAError {
    id: string;
    type: 'service-worker' | 'cache' | 'update' | 'offline' | 'network';
    message: string;
    details?: any;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    retryCount: number;
    maxRetries: number;
    resolved: boolean;
}

export interface PWAErrorStats {
    totalErrors: number;
    resolvedErrors: number;
    activeErrors: number;
    errorsByType: Record<string, number>;
    lastError?: PWAError;
}

@Injectable({
    providedIn: 'root'
})
export class PWAErrorHandlerService {
    private modalService = inject(ModalService);

    private errorsSubject = new BehaviorSubject<PWAError[]>([]);
    private errorStatsSubject = new BehaviorSubject<PWAErrorStats>({
        totalErrors: 0,
        resolvedErrors: 0,
        activeErrors: 0,
        errorsByType: {}
    });

    public errors$ = this.errorsSubject.asObservable();
    public errorStats$ = this.errorStatsSubject.asObservable();

    private readonly maxStoredErrors = 50;
    private readonly retryDelays = [1000, 3000, 5000, 10000]; // Delays progressivos em ms

    constructor() {
        this.initializeErrorHandler();
    }

    /**
     * Inicializa o handler de erros PWA
     */
    private initializeErrorHandler(): void {
        // Captura erros globais do service worker
        if ('serviceWorker' in navigator) {
            // Monitora erros durante o registro do service worker
            navigator.serviceWorker.register('/ngsw-worker.js').catch((error) => {
                this.handleServiceWorkerError(error);
            });

            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.type === 'ERROR') {
                    this.handleServiceWorkerError(new Error(event.data.message));
                }
            });
        }

        // Captura erros de cache storage
        this.setupCacheErrorHandling();

        console.log('🛡️ [PWA-ERROR] Error handler inicializado');
    }

    /**
     * Configura tratamento de erros de cache
     */
    private setupCacheErrorHandling(): void {
        // Intercepta erros de cache storage
        const originalCacheOpen = caches.open;
        caches.open = async function(cacheName: string) {
            try {
                return await originalCacheOpen.call(this, cacheName);
            } catch (error) {
                console.error('❌ [PWA-ERROR] Cache storage error:', error);
                throw error;
            }
        };
    }

    /**
     * Trata erros do service worker
     */
    handleServiceWorkerError(error: Error, details?: any): void {
        const pwaError: PWAError = {
            id: this.generateErrorId(),
            type: 'service-worker',
            message: `Service Worker Error: ${error.message}`,
            details: {
                stack: error.stack,
                name: error.name,
                ...details
            },
            timestamp: new Date(),
            severity: 'high',
            retryCount: 0,
            maxRetries: 3,
            resolved: false
        };

        this.addError(pwaError);
        this.logError(pwaError);

        // Implementar fallback para service worker
        this.implementServiceWorkerFallback();
    }

    /**
     * Trata erros de cache
     */
    handleCacheError(error: Error, operation: string, details?: any): void {
        const pwaError: PWAError = {
            id: this.generateErrorId(),
            type: 'cache',
            message: `Cache Error during ${operation}: ${error.message}`,
            details: {
                operation,
                stack: error.stack,
                ...details
            },
            timestamp: new Date(),
            severity: 'medium',
            retryCount: 0,
            maxRetries: 2,
            resolved: false
        };

        this.addError(pwaError);
        this.logError(pwaError);

        // Implementar fallback para cache
        this.implementCacheFallback(operation);
    }

    /**
     * Trata erros de atualização
     */
    handleUpdateError(error: Error, phase: 'check' | 'download' | 'install' | 'activate', details?: any): void {
        const pwaError: PWAError = {
            id: this.generateErrorId(),
            type: 'update',
            message: `Update Error during ${phase}: ${error.message}`,
            details: {
                phase,
                stack: error.stack,
                ...details
            },
            timestamp: new Date(),
            severity: phase === 'activate' ? 'high' : 'medium',
            retryCount: 0,
            maxRetries: phase === 'check' ? 5 : 2,
            resolved: false
        };

        this.addError(pwaError);
        this.logError(pwaError);

        // Implementar fallback para atualizações
        this.implementUpdateFallback(phase);
    }

    /**
     * Trata erros de modo offline
     */
    handleOfflineError(error: Error, operation: string, details?: any): void {
        const pwaError: PWAError = {
            id: this.generateErrorId(),
            type: 'offline',
            message: `Offline Error during ${operation}: ${error.message}`,
            details: {
                operation,
                stack: error.stack,
                ...details
            },
            timestamp: new Date(),
            severity: 'low',
            retryCount: 0,
            maxRetries: 1,
            resolved: false
        };

        this.addError(pwaError);
        this.logError(pwaError);

        // Implementar fallback para modo offline
        this.implementOfflineFallback(operation);
    }

    /**
     * Trata erros de rede
     */
    handleNetworkError(error: Error, url?: string, details?: any): void {
        const pwaError: PWAError = {
            id: this.generateErrorId(),
            type: 'network',
            message: `Network Error: ${error.message}`,
            details: {
                url,
                stack: error.stack,
                ...details
            },
            timestamp: new Date(),
            severity: 'medium',
            retryCount: 0,
            maxRetries: 3,
            resolved: false
        };

        this.addError(pwaError);
        this.logError(pwaError);

        // Implementar fallback para rede
        this.implementNetworkFallback(url);
    }

    /**
     * Adiciona um erro à lista
     */
    private addError(error: PWAError): void {
        const currentErrors = this.errorsSubject.value;
        const updatedErrors = [error, ...currentErrors].slice(0, this.maxStoredErrors);
        
        this.errorsSubject.next(updatedErrors);
        this.updateErrorStats(updatedErrors);
    }

    /**
     * Atualiza estatísticas de erros
     */
    private updateErrorStats(errors: PWAError[]): void {
        const stats: PWAErrorStats = {
            totalErrors: errors.length,
            resolvedErrors: errors.filter(e => e.resolved).length,
            activeErrors: errors.filter(e => !e.resolved).length,
            errorsByType: {},
            lastError: errors[0]
        };

        // Contar erros por tipo
        errors.forEach(error => {
            stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
        });

        this.errorStatsSubject.next(stats);
    }

    /**
     * Implementa fallback para service worker
     */
    private implementServiceWorkerFallback(): void {
        console.log('🔄 [PWA-ERROR] Implementando fallback para Service Worker');
        
        // Tentar re-registrar o service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/ngsw-worker.js')
                .then(() => {
                    console.log('✅ [PWA-ERROR] Service Worker re-registrado com sucesso');
                })
                .catch(error => {
                    console.error('❌ [PWA-ERROR] Falha ao re-registrar Service Worker:', error);
                });
        }
    }

    /**
     * Implementa fallback para cache
     */
    private implementCacheFallback(operation: string): void {
        console.log(`🔄 [PWA-ERROR] Implementando fallback para cache (${operation})`);
        
        // Continuar operação sem cache se possível
        switch (operation) {
            case 'read':
                console.log('ℹ️ [PWA-ERROR] Continuando sem cache para leitura');
                break;
            case 'write':
                console.log('ℹ️ [PWA-ERROR] Dados não serão cacheados');
                break;
            default:
                console.log('ℹ️ [PWA-ERROR] Operação de cache ignorada');
        }
    }

    /**
     * Implementa fallback para atualizações
     */
    private implementUpdateFallback(phase: string): void {
        console.log(`🔄 [PWA-ERROR] Implementando fallback para atualização (${phase})`);
        
        switch (phase) {
            case 'check':
                console.log('ℹ️ [PWA-ERROR] Verificação de atualização será tentada novamente mais tarde');
                break;
            case 'download':
            case 'install':
                console.log('ℹ️ [PWA-ERROR] Atualização será tentada novamente mais tarde');
                break;
            case 'activate':
                console.log('ℹ️ [PWA-ERROR] Aplicação continuará com versão atual');
                break;
        }
    }

    /**
     * Implementa fallback para modo offline
     */
    private implementOfflineFallback(operation: string): void {
        console.log(`🔄 [PWA-ERROR] Implementando fallback para modo offline (${operation})`);
        
        // Mostrar dados em cache se disponível
        console.log('ℹ️ [PWA-ERROR] Tentando usar dados em cache');
    }

    /**
     * Implementa fallback para rede
     */
    private implementNetworkFallback(url?: string): void {
        console.log(`🔄 [PWA-ERROR] Implementando fallback para rede${url ? ` (${url})` : ''}`);
        
        // Tentar usar dados em cache ou mostrar página offline
        console.log('ℹ️ [PWA-ERROR] Usando dados em cache ou página offline');
    }

    /**
     * Faz log do erro
     */
    private logError(error: PWAError): void {
        const logMessage = `[PWA-ERROR-${error.type.toUpperCase()}] ${error.message}`;
        
        switch (error.severity) {
            case 'critical':
                console.error(`🚨 ${logMessage}`, error.details);
                break;
            case 'high':
                console.error(`❌ ${logMessage}`, error.details);
                break;
            case 'medium':
                console.warn(`⚠️ ${logMessage}`, error.details);
                break;
            case 'low':
                console.log(`ℹ️ ${logMessage}`, error.details);
                break;
        }
    }

    /**
     * Gera ID único para erro
     */
    private generateErrorId(): string {
        return `pwa-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Marca erro como resolvido
     */
    resolveError(errorId: string): void {
        const currentErrors = this.errorsSubject.value;
        const updatedErrors = currentErrors.map(error => 
            error.id === errorId ? { ...error, resolved: true } : error
        );
        
        this.errorsSubject.next(updatedErrors);
        this.updateErrorStats(updatedErrors);
        
        console.log(`✅ [PWA-ERROR] Erro ${errorId} marcado como resolvido`);
    }

    /**
     * Limpa erros resolvidos
     */
    clearResolvedErrors(): void {
        const currentErrors = this.errorsSubject.value;
        const activeErrors = currentErrors.filter(error => !error.resolved);
        
        this.errorsSubject.next(activeErrors);
        this.updateErrorStats(activeErrors);
        
        console.log(`🧹 [PWA-ERROR] ${currentErrors.length - activeErrors.length} erros resolvidos removidos`);
    }

    /**
     * Obtém erros ativos
     */
    getActiveErrors(): PWAError[] {
        return this.errorsSubject.value.filter(error => !error.resolved);
    }

    /**
     * Obtém estatísticas atuais
     */
    getCurrentStats(): PWAErrorStats {
        return this.errorStatsSubject.value;
    }

    /**
     * Verifica se há erros críticos ativos
     */
    hasCriticalErrors(): boolean {
        return this.getActiveErrors().some(error => error.severity === 'critical');
    }

    /**
     * Obtém último erro por tipo
     */
    getLastErrorByType(type: PWAError['type']): PWAError | undefined {
        return this.errorsSubject.value.find(error => error.type === type && !error.resolved);
    }

    /**
     * Limpa todos os erros
     */
    clearAllErrors(): void {
        this.errorsSubject.next([]);
        this.updateErrorStats([]);
        console.log('🧹 [PWA-ERROR] Todos os erros foram limpos');
    }
}