import { Injectable } from '@angular/core';
import { Observable, timer, throwError, EMPTY } from 'rxjs';
import { retryWhen, switchMap, take, tap, delay, concatMap } from 'rxjs/operators';

export interface RetryOptions {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterEnabled: boolean;
    retryCondition?: (error: any) => boolean;
}

export interface RetryAttempt {
    attemptNumber: number;
    error: any;
    nextDelay: number;
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class PWARetryService {
    private readonly defaultOptions: RetryOptions = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterEnabled: true,
        retryCondition: () => true
    };

    /**
     * Operador RxJS para retry com backoff exponencial
     */
    retryWithBackoff<T>(options: Partial<RetryOptions> = {}) {
        const config = { ...this.defaultOptions, ...options };

        return (source: Observable<T>) => {
            return source.pipe(
                retryWhen(errors => 
                    errors.pipe(
                        concatMap((error, index) => {
                            const attemptNumber = index + 1;

                            // Verifica se deve tentar novamente
                            if (attemptNumber > config.maxRetries || 
                                (config.retryCondition && !config.retryCondition(error))) {
                                return throwError(() => error);
                            }

                            // Calcula delay com backoff exponencial
                            const delay = this.calculateDelay(attemptNumber, config);

                            console.log(`🔄 [PWA-RETRY] Tentativa ${attemptNumber}/${config.maxRetries} em ${delay}ms`);

                            return timer(delay).pipe(
                                tap(() => {
                                    console.log(`🔄 [PWA-RETRY] Executando tentativa ${attemptNumber}`);
                                })
                            );
                        })
                    )
                )
            );
        };
    }

    /**
     * Retry para operações assíncronas (Promises)
     */
    async retryAsync<T>(
        operation: () => Promise<T>,
        options: Partial<RetryOptions> = {}
    ): Promise<T> {
        const config = { ...this.defaultOptions, ...options };
        let lastError: any;

        for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
            try {
                const result = await operation();
                
                if (attempt > 1) {
                    console.log(`✅ [PWA-RETRY] Operação bem-sucedida na tentativa ${attempt}`);
                }
                
                return result;
            } catch (error) {
                lastError = error;

                // Se é a última tentativa ou não deve tentar novamente
                if (attempt > config.maxRetries || 
                    (config.retryCondition && !config.retryCondition(error))) {
                    break;
                }

                // Calcula delay para próxima tentativa
                const delayMs = this.calculateDelay(attempt, config);
                
                console.log(`🔄 [PWA-RETRY] Tentativa ${attempt}/${config.maxRetries} falhou. Tentando novamente em ${delayMs}ms`);
                console.log(`❌ [PWA-RETRY] Erro:`, error);

                // Aguarda antes da próxima tentativa
                await this.sleep(delayMs);
            }
        }

        console.error(`❌ [PWA-RETRY] Todas as tentativas falharam. Último erro:`, lastError);
        throw lastError;
    }

    /**
     * Retry específico para operações de rede
     */
    retryNetworkOperation<T>(
        operation: () => Promise<T>,
        customOptions: Partial<RetryOptions> = {}
    ): Promise<T> {
        const networkRetryOptions: Partial<RetryOptions> = {
            maxRetries: 5,
            baseDelay: 2000,
            maxDelay: 15000,
            retryCondition: (error) => {
                // Retry apenas para erros de rede, não para erros de autenticação
                return error?.code !== 'permission-denied' && 
                       error?.code !== 'unauthenticated' &&
                       (error?.message?.includes('network') || 
                        error?.message?.includes('fetch') ||
                        error?.message?.includes('timeout') ||
                        !navigator.onLine);
            },
            ...customOptions
        };

        return this.retryAsync(operation, networkRetryOptions);
    }

    /**
     * Retry específico para operações de cache
     */
    retryCacheOperation<T>(
        operation: () => Promise<T>,
        customOptions: Partial<RetryOptions> = {}
    ): Promise<T> {
        const cacheRetryOptions: Partial<RetryOptions> = {
            maxRetries: 2,
            baseDelay: 500,
            maxDelay: 5000,
            retryCondition: (error) => {
                // Retry para erros de quota ou acesso ao cache
                return error?.name === 'QuotaExceededError' ||
                       error?.message?.includes('cache') ||
                       error?.message?.includes('storage');
            },
            ...customOptions
        };

        return this.retryAsync(operation, cacheRetryOptions);
    }

    /**
     * Retry específico para service worker
     */
    retryServiceWorkerOperation<T>(
        operation: () => Promise<T>,
        customOptions: Partial<RetryOptions> = {}
    ): Promise<T> {
        const swRetryOptions: Partial<RetryOptions> = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            retryCondition: (error) => {
                // Retry para erros de service worker, mas não para erros de registro
                return !error?.message?.includes('registration') &&
                       !error?.message?.includes('unsupported');
            },
            ...customOptions
        };

        return this.retryAsync(operation, swRetryOptions);
    }

    /**
     * Calcula delay com backoff exponencial e jitter
     */
    private calculateDelay(attempt: number, config: RetryOptions): number {
        let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        delay = Math.min(delay, config.maxDelay);

        // Adiciona jitter se habilitado
        if (config.jitterEnabled) {
            const jitter = delay * 0.1 * (Math.random() - 0.5);
            delay += jitter;
        }

        return Math.max(Math.floor(delay), 100); // Mínimo de 100ms
    }

    /**
     * Utilitário para sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Verifica se um erro é recuperável
     */
    isRecoverableError(error: any): boolean {
        // Erros que não devem ser retentados
        const nonRecoverableErrors = [
            'permission-denied',
            'unauthenticated',
            'invalid-argument',
            'not-found'
        ];

        if (error?.code && nonRecoverableErrors.includes(error.code)) {
            return false;
        }

        // Erros de rede são geralmente recuperáveis
        if (error?.message?.includes('network') || 
            error?.message?.includes('fetch') ||
            error?.message?.includes('timeout')) {
            return true;
        }

        // Erros de cache são recuperáveis
        if (error?.name === 'QuotaExceededError' ||
            error?.message?.includes('cache') ||
            error?.message?.includes('storage')) {
            return true;
        }

        // Por padrão, considera recuperável
        return true;
    }

    /**
     * Cria configuração de retry baseada no tipo de operação
     */
    createRetryConfig(
        operationType: 'network' | 'cache' | 'service-worker' | 'general',
        customOptions: Partial<RetryOptions> = {}
    ): RetryOptions {
        let baseConfig: Partial<RetryOptions>;

        switch (operationType) {
            case 'network':
                baseConfig = {
                    maxRetries: 5,
                    baseDelay: 2000,
                    maxDelay: 15000,
                    backoffMultiplier: 1.5
                };
                break;
            case 'cache':
                baseConfig = {
                    maxRetries: 2,
                    baseDelay: 500,
                    maxDelay: 5000,
                    backoffMultiplier: 2
                };
                break;
            case 'service-worker':
                baseConfig = {
                    maxRetries: 3,
                    baseDelay: 1000,
                    maxDelay: 10000,
                    backoffMultiplier: 2
                };
                break;
            default:
                baseConfig = {};
        }

        return { ...this.defaultOptions, ...baseConfig, ...customOptions };
    }
}