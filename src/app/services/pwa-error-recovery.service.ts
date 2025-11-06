import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, timer, of, EMPTY } from 'rxjs';
import { switchMap, retryWhen, delay, take, tap, catchError } from 'rxjs/operators';
import { PWAErrorHandlerService, PWAError } from './pwa-error-handler.service';
import { PWARetryService } from './pwa-retry.service';
import { ModalService } from './modal.service';

export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterEnabled: boolean;
}

export interface RecoveryOperation {
    id: string;
    type: 'service-worker' | 'cache' | 'update' | 'network' | 'offline';
    operation: () => Promise<any>;
    retryConfig: RetryConfig;
    currentAttempt: number;
    status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
    lastError?: Error;
    startTime: Date;
    endTime?: Date;
}

export interface RecoveryStats {
    totalOperations: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    averageRecoveryTime: number;
    operationsByType: Record<string, number>;
}

@Injectable({
    providedIn: 'root'
})
export class PWAErrorRecoveryService {
    private errorHandler = inject(PWAErrorHandlerService);
    private retryService = inject(PWARetryService);
    private modalService = inject(ModalService);

    private operationsSubject = new BehaviorSubject<RecoveryOperation[]>([]);
    private recoveryStatsSubject = new BehaviorSubject<RecoveryStats>({
        totalOperations: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        averageRecoveryTime: 0,
        operationsByType: {}
    });

    public operations$ = this.operationsSubject.asObservable();
    public recoveryStats$ = this.recoveryStatsSubject.asObservable();

    private readonly defaultRetryConfig: RetryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterEnabled: true
    };

    private notificationCooldown = new Map<string, number>();
    private readonly cooldownDuration = 30000; // 30 segundos

    constructor() {
        this.initializeRecoveryService();
    }

    /**
     * Inicializa o serviço de recuperação
     */
    private initializeRecoveryService(): void {
        // Monitora erros do error handler para recuperação automática
        this.errorHandler.errors$.subscribe(errors => {
            const activeErrors = errors.filter(error => !error.resolved);
            activeErrors.forEach(error => {
                this.scheduleAutoRecovery(error);
            });
        });

        console.log('🔄 [PWA-RECOVERY] Serviço de recuperação inicializado');
    }

    /**
     * Agenda recuperação automática para um erro
     */
    private scheduleAutoRecovery(error: PWAError): void {
        if (error.retryCount >= error.maxRetries) {
            return;
        }

        const delay = this.calculateRetryDelay(error.retryCount, this.defaultRetryConfig);
        
        timer(delay).subscribe(() => {
            this.attemptAutoRecovery(error);
        });
    }

    /**
     * Tenta recuperação automática
     */
    private async attemptAutoRecovery(error: PWAError): Promise<void> {
        console.log(`🔄 [PWA-RECOVERY] Tentando recuperação automática para erro ${error.id}`);

        try {
            switch (error.type) {
                case 'service-worker':
                    await this.recoverServiceWorker();
                    break;
                case 'cache':
                    await this.recoverCache(error.details?.operation);
                    break;
                case 'update':
                    await this.recoverUpdate(error.details?.phase);
                    break;
                case 'network':
                    await this.recoverNetwork(error.details?.url);
                    break;
                case 'offline':
                    await this.recoverOffline(error.details?.operation);
                    break;
            }

            // Marca erro como resolvido se recuperação foi bem-sucedida
            this.errorHandler.resolveError(error.id);
            console.log(`✅ [PWA-RECOVERY] Recuperação automática bem-sucedida para erro ${error.id}`);

        } catch (recoveryError) {
            console.error(`❌ [PWA-RECOVERY] Falha na recuperação automática para erro ${error.id}:`, recoveryError);
            
            // Incrementa contador de retry no erro original
            error.retryCount++;
            
            // Se ainda há tentativas, agenda nova recuperação
            if (error.retryCount < error.maxRetries) {
                this.scheduleAutoRecovery(error);
            } else {
                // Notifica usuário sobre falha persistente
                this.notifyUserAboutPersistentError(error);
            }
        }
    }

    /**
     * Recupera service worker
     */
    async recoverServiceWorker(): Promise<void> {
        const operation: RecoveryOperation = {
            id: this.generateOperationId(),
            type: 'service-worker',
            operation: async () => {
                if ('serviceWorker' in navigator) {
                    // Desregistra service worker atual
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                    }

                    // Re-registra service worker
                    const registration = await navigator.serviceWorker.register('/ngsw-worker.js');
                    await registration.update();
                    
                    return registration;
                }
                throw new Error('Service Worker não suportado');
            },
            retryConfig: { ...this.defaultRetryConfig, maxRetries: 2 },
            currentAttempt: 0,
            status: 'pending',
            startTime: new Date()
        };

        return this.executeRecoveryOperation(operation);
    }

    /**
     * Recupera cache
     */
    async recoverCache(operation?: string): Promise<void> {
        const recoveryOp: RecoveryOperation = {
            id: this.generateOperationId(),
            type: 'cache',
            operation: async () => {
                // Limpa cache corrompido
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.includes('ngsw') || cacheName.includes('data')) {
                        await caches.delete(cacheName);
                    }
                }

                // Força recriação do cache
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        action: 'CACHE_REFRESH'
                    });
                }

                return true;
            },
            retryConfig: { ...this.defaultRetryConfig, maxRetries: 2 },
            currentAttempt: 0,
            status: 'pending',
            startTime: new Date()
        };

        return this.executeRecoveryOperation(recoveryOp);
    }

    /**
     * Recupera processo de atualização
     */
    async recoverUpdate(phase?: string): Promise<void> {
        const operation: RecoveryOperation = {
            id: this.generateOperationId(),
            type: 'update',
            operation: async () => {
                // Força verificação de atualização
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        action: 'CHECK_FOR_UPDATES'
                    });
                }

                // Aguarda um tempo para o processo completar
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                return true;
            },
            retryConfig: { ...this.defaultRetryConfig, maxRetries: 1 },
            currentAttempt: 0,
            status: 'pending',
            startTime: new Date()
        };

        return this.executeRecoveryOperation(operation);
    }

    /**
     * Recupera conectividade de rede
     */
    async recoverNetwork(url?: string): Promise<void> {
        const operation: RecoveryOperation = {
            id: this.generateOperationId(),
            type: 'network',
            operation: async () => {
                // Testa conectividade básica
                const testUrl = url || '/favicon.ico';
                const response = await fetch(testUrl, { 
                    method: 'HEAD',
                    cache: 'no-cache'
                });

                if (!response.ok) {
                    throw new Error(`Network test failed: ${response.status}`);
                }

                return true;
            },
            retryConfig: { 
                ...this.defaultRetryConfig, 
                maxRetries: 5,
                baseDelay: 2000 
            },
            currentAttempt: 0,
            status: 'pending',
            startTime: new Date()
        };

        return this.executeRecoveryOperation(operation);
    }

    /**
     * Recupera modo offline
     */
    async recoverOffline(operation?: string): Promise<void> {
        const recoveryOp: RecoveryOperation = {
            id: this.generateOperationId(),
            type: 'offline',
            operation: async () => {
                // Verifica se voltou online
                if (navigator.onLine) {
                    // Força sincronização de dados pendentes
                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({
                            action: 'SYNC_WHEN_ONLINE'
                        });
                    }
                    return true;
                }

                // Se ainda offline, verifica cache disponível
                const cacheNames = await caches.keys();
                return cacheNames.length > 0;
            },
            retryConfig: { 
                ...this.defaultRetryConfig, 
                maxRetries: 1,
                baseDelay: 5000 
            },
            currentAttempt: 0,
            status: 'pending',
            startTime: new Date()
        };

        return this.executeRecoveryOperation(recoveryOp);
    }

    /**
     * Executa operação de recuperação com retry
     */
    private async executeRecoveryOperation(operation: RecoveryOperation): Promise<void> {
        this.addOperation(operation);

        return new Promise((resolve, reject) => {
            const executeWithRetry = () => {
                operation.status = 'running';
                operation.currentAttempt++;
                this.updateOperation(operation);

                operation.operation()
                    .then(result => {
                        operation.status = 'success';
                        operation.endTime = new Date();
                        this.updateOperation(operation);
                        this.updateRecoveryStats();
                        resolve(result);
                    })
                    .catch(error => {
                        operation.lastError = error;
                        
                        if (operation.currentAttempt < operation.retryConfig.maxRetries) {
                            operation.status = 'pending';
                            this.updateOperation(operation);
                            
                            const delay = this.calculateRetryDelay(
                                operation.currentAttempt, 
                                operation.retryConfig
                            );
                            
                            setTimeout(executeWithRetry, delay);
                        } else {
                            operation.status = 'failed';
                            operation.endTime = new Date();
                            this.updateOperation(operation);
                            this.updateRecoveryStats();
                            reject(error);
                        }
                    });
            };

            executeWithRetry();
        });
    }

    /**
     * Calcula delay para retry com backoff exponencial
     */
    private calculateRetryDelay(attempt: number, config: RetryConfig): number {
        let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
        delay = Math.min(delay, config.maxDelay);

        // Adiciona jitter se habilitado
        if (config.jitterEnabled) {
            const jitter = delay * 0.1 * Math.random();
            delay += jitter;
        }

        return Math.floor(delay);
    }

    /**
     * Notifica usuário sobre erro persistente
     */
    private notifyUserAboutPersistentError(error: PWAError): void {
        const cooldownKey = `${error.type}-notification`;
        const now = Date.now();
        const lastNotification = this.notificationCooldown.get(cooldownKey) || 0;

        // Verifica cooldown para evitar spam de notificações
        if (now - lastNotification < this.cooldownDuration) {
            return;
        }

        this.notificationCooldown.set(cooldownKey, now);

        // Notificação discreta baseada no tipo de erro
        switch (error.type) {
            case 'service-worker':
                this.showDiscreteNotification(
                    'Algumas funcionalidades offline podem estar limitadas',
                    'info'
                );
                break;
            case 'cache':
                this.showDiscreteNotification(
                    'O carregamento pode estar mais lento que o normal',
                    'warning'
                );
                break;
            case 'update':
                this.showDiscreteNotification(
                    'Não foi possível verificar atualizações automaticamente',
                    'info'
                );
                break;
            case 'network':
                this.showDiscreteNotification(
                    'Problemas de conectividade detectados',
                    'warning'
                );
                break;
            case 'offline':
                // Não notifica para erros offline (são esperados)
                break;
        }
    }

    /**
     * Mostra notificação discreta
     */
    private showDiscreteNotification(message: string, type: 'info' | 'warning' | 'error'): void {
        // Usa o modal service para notificações discretas
        switch (type) {
            case 'info':
                console.log(`ℹ️ [PWA-RECOVERY] ${message}`);
                break;
            case 'warning':
                console.warn(`⚠️ [PWA-RECOVERY] ${message}`);
                // Poderia mostrar um toast discreto aqui
                break;
            case 'error':
                console.error(`❌ [PWA-RECOVERY] ${message}`);
                this.modalService.showError(message);
                break;
        }
    }

    /**
     * Adiciona operação à lista
     */
    private addOperation(operation: RecoveryOperation): void {
        const currentOperations = this.operationsSubject.value;
        this.operationsSubject.next([operation, ...currentOperations].slice(0, 20));
    }

    /**
     * Atualiza operação existente
     */
    private updateOperation(operation: RecoveryOperation): void {
        const currentOperations = this.operationsSubject.value;
        const updatedOperations = currentOperations.map(op => 
            op.id === operation.id ? operation : op
        );
        this.operationsSubject.next(updatedOperations);
    }

    /**
     * Atualiza estatísticas de recuperação
     */
    private updateRecoveryStats(): void {
        const operations = this.operationsSubject.value;
        const completedOperations = operations.filter(op => 
            op.status === 'success' || op.status === 'failed'
        );

        const successfulRecoveries = operations.filter(op => op.status === 'success').length;
        const failedRecoveries = operations.filter(op => op.status === 'failed').length;

        // Calcula tempo médio de recuperação
        const recoveryTimes = completedOperations
            .filter(op => op.endTime)
            .map(op => op.endTime!.getTime() - op.startTime.getTime());
        
        const averageRecoveryTime = recoveryTimes.length > 0 
            ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length
            : 0;

        // Conta operações por tipo
        const operationsByType: Record<string, number> = {};
        operations.forEach(op => {
            operationsByType[op.type] = (operationsByType[op.type] || 0) + 1;
        });

        const stats: RecoveryStats = {
            totalOperations: operations.length,
            successfulRecoveries,
            failedRecoveries,
            averageRecoveryTime,
            operationsByType
        };

        this.recoveryStatsSubject.next(stats);
    }

    /**
     * Gera ID único para operação
     */
    private generateOperationId(): string {
        return `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Força recuperação manual para um tipo específico
     */
    async forceRecovery(type: PWAError['type']): Promise<boolean> {
        try {
            switch (type) {
                case 'service-worker':
                    await this.recoverServiceWorker();
                    break;
                case 'cache':
                    await this.recoverCache();
                    break;
                case 'update':
                    await this.recoverUpdate();
                    break;
                case 'network':
                    await this.recoverNetwork();
                    break;
                case 'offline':
                    await this.recoverOffline();
                    break;
            }
            return true;
        } catch (error) {
            console.error(`❌ [PWA-RECOVERY] Falha na recuperação manual (${type}):`, error);
            return false;
        }
    }

    /**
     * Obtém operações ativas
     */
    getActiveOperations(): RecoveryOperation[] {
        return this.operationsSubject.value.filter(op => 
            op.status === 'pending' || op.status === 'running'
        );
    }

    /**
     * Obtém estatísticas atuais
     */
    getCurrentStats(): RecoveryStats {
        return this.recoveryStatsSubject.value;
    }

    /**
     * Cancela operação específica
     */
    cancelOperation(operationId: string): void {
        const currentOperations = this.operationsSubject.value;
        const updatedOperations = currentOperations.map(op => 
            op.id === operationId ? { ...op, status: 'cancelled' as const } : op
        );
        this.operationsSubject.next(updatedOperations);
        console.log(`🚫 [PWA-RECOVERY] Operação ${operationId} cancelada`);
    }

    /**
     * Limpa operações antigas
     */
    clearOldOperations(): void {
        const currentOperations = this.operationsSubject.value;
        const recentOperations = currentOperations.filter(op => {
            const age = Date.now() - op.startTime.getTime();
            return age < 24 * 60 * 60 * 1000; // Mantém últimas 24 horas
        });
        
        this.operationsSubject.next(recentOperations);
        this.updateRecoveryStats();
        
        console.log(`🧹 [PWA-RECOVERY] ${currentOperations.length - recentOperations.length} operações antigas removidas`);
    }
}