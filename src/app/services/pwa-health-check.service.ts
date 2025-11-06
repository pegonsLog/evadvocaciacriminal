import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { PWAErrorHandlerService } from './pwa-error-handler.service';
import { PWARetryService } from './pwa-retry.service';

export interface PWAHealthStatus {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    serviceWorker: 'active' | 'inactive' | 'error';
    cache: 'working' | 'limited' | 'failed';
    updates: 'working' | 'disabled' | 'error';
    offline: 'supported' | 'limited' | 'unsupported';
    lastCheck: Date;
    issues: string[];
}

@Injectable({
    providedIn: 'root'
})
export class PWAHealthCheckService {
    private errorHandler = inject(PWAErrorHandlerService);
    private retryService = inject(PWARetryService);

    private healthStatusSubject = new BehaviorSubject<PWAHealthStatus>({
        overall: 'healthy',
        serviceWorker: 'inactive',
        cache: 'working',
        updates: 'working',
        offline: 'supported',
        lastCheck: new Date(),
        issues: []
    });

    public healthStatus$ = this.healthStatusSubject.asObservable();

    constructor() {
        this.initializeHealthCheck();
    }

    /**
     * Inicializa verificações de saúde periódicas
     */
    private initializeHealthCheck(): void {
        // Verificação inicial
        this.performHealthCheck();

        // Verificações periódicas a cada 5 minutos
        timer(0, 5 * 60 * 1000).subscribe(() => {
            this.performHealthCheck();
        });

        console.log('🏥 [PWA-HEALTH] Health check inicializado');
    }

    /**
     * Executa verificação completa de saúde do PWA
     */
    async performHealthCheck(): Promise<PWAHealthStatus> {
        const issues: string[] = [];
        
        try {
            // Verifica Service Worker
            const swStatus = await this.checkServiceWorkerHealth();
            
            // Verifica Cache
            const cacheStatus = await this.checkCacheHealth();
            
            // Verifica sistema de atualizações
            const updateStatus = await this.checkUpdateSystemHealth();
            
            // Verifica suporte offline
            const offlineStatus = await this.checkOfflineSupport();

            // Determina status geral
            const overall = this.determineOverallHealth(swStatus, cacheStatus, updateStatus, offlineStatus, issues);

            const healthStatus: PWAHealthStatus = {
                overall,
                serviceWorker: swStatus,
                cache: cacheStatus,
                updates: updateStatus,
                offline: offlineStatus,
                lastCheck: new Date(),
                issues
            };

            this.healthStatusSubject.next(healthStatus);
            this.logHealthStatus(healthStatus);

            return healthStatus;
        } catch (error) {
            console.error('❌ [PWA-HEALTH] Erro durante verificação de saúde:', error);
            this.errorHandler.handleServiceWorkerError(
                error as Error,
                { source: 'health-check' }
            );

            const errorStatus: PWAHealthStatus = {
                overall: 'unhealthy',
                serviceWorker: 'error',
                cache: 'failed',
                updates: 'error',
                offline: 'unsupported',
                lastCheck: new Date(),
                issues: ['Falha na verificação de saúde do PWA']
            };

            this.healthStatusSubject.next(errorStatus);
            return errorStatus;
        }
    }

    /**
     * Verifica saúde do Service Worker
     */
    private async checkServiceWorkerHealth(): Promise<PWAHealthStatus['serviceWorker']> {
        try {
            if (!('serviceWorker' in navigator)) {
                return 'inactive';
            }

            const registration = await navigator.serviceWorker.getRegistration();
            
            if (!registration) {
                return 'inactive';
            }

            if (registration.active) {
                // Testa comunicação com o service worker
                return new Promise<PWAHealthStatus['serviceWorker']>((resolve) => {
                    const messageChannel = new MessageChannel();
                    
                    messageChannel.port1.onmessage = (event) => {
                        if (event.data?.type === 'HEALTH_CHECK_RESPONSE') {
                            resolve('active');
                        } else {
                            resolve('error');
                        }
                    };

                    // Timeout se não responder em 5 segundos
                    setTimeout(() => resolve('error'), 5000);

                    registration.active?.postMessage(
                        { type: 'HEALTH_CHECK' },
                        [messageChannel.port2]
                    );
                });
            }

            return 'inactive';
        } catch (error) {
            console.error('❌ [PWA-HEALTH] Erro ao verificar Service Worker:', error);
            return 'error';
        }
    }

    /**
     * Verifica saúde do sistema de cache
     */
    private async checkCacheHealth(): Promise<PWAHealthStatus['cache']> {
        try {
            // Testa se pode acessar cache storage
            const testCacheName = 'pwa-health-test';
            const cache = await caches.open(testCacheName);
            
            // Testa operações básicas de cache
            const testUrl = '/favicon.ico';
            const testResponse = new Response('test', { status: 200 });
            
            await cache.put(testUrl, testResponse.clone());
            const cachedResponse = await cache.match(testUrl);
            
            // Limpa cache de teste
            await caches.delete(testCacheName);

            return cachedResponse ? 'working' : 'limited';
        } catch (error) {
            console.error('❌ [PWA-HEALTH] Erro ao verificar cache:', error);
            
            if (error?.name === 'QuotaExceededError') {
                return 'limited';
            }
            
            return 'failed';
        }
    }

    /**
     * Verifica saúde do sistema de atualizações
     */
    private async checkUpdateSystemHealth(): Promise<PWAHealthStatus['updates']> {
        try {
            // Verifica se o SwUpdate está disponível e funcionando
            if (!('serviceWorker' in navigator)) {
                return 'disabled';
            }

            const registration = await navigator.serviceWorker.getRegistration();
            
            if (!registration) {
                return 'disabled';
            }

            // Se há service worker ativo, sistema de updates deve estar funcionando
            return registration.active ? 'working' : 'disabled';
        } catch (error) {
            console.error('❌ [PWA-HEALTH] Erro ao verificar sistema de atualizações:', error);
            return 'error';
        }
    }

    /**
     * Verifica suporte offline
     */
    private async checkOfflineSupport(): Promise<PWAHealthStatus['offline']> {
        try {
            // Verifica se há caches disponíveis
            const cacheNames = await caches.keys();
            const hasAppCache = cacheNames.some(name => 
                name.includes('ngsw') || name.includes('app')
            );

            if (!hasAppCache) {
                return 'limited';
            }

            // Verifica se há dados em cache
            const hasDataCache = cacheNames.some(name => 
                name.includes('data') || name.includes('api')
            );

            return hasDataCache ? 'supported' : 'limited';
        } catch (error) {
            console.error('❌ [PWA-HEALTH] Erro ao verificar suporte offline:', error);
            return 'unsupported';
        }
    }

    /**
     * Determina status geral de saúde
     */
    private determineOverallHealth(
        sw: PWAHealthStatus['serviceWorker'],
        cache: PWAHealthStatus['cache'],
        updates: PWAHealthStatus['updates'],
        offline: PWAHealthStatus['offline'],
        issues: string[]
    ): PWAHealthStatus['overall'] {
        // Se há muitos problemas, considera não saudável
        if (issues.length > 3) {
            return 'unhealthy';
        }

        // Se service worker ou cache falharam, considera não saudável
        if (sw === 'error' || cache === 'failed') {
            return 'unhealthy';
        }

        // Se há algumas limitações, considera degradado
        if (sw === 'inactive' || cache === 'limited' || updates === 'disabled' || offline === 'limited') {
            return 'degraded';
        }

        return 'healthy';
    }

    /**
     * Faz log do status de saúde
     */
    private logHealthStatus(status: PWAHealthStatus): void {
        const emoji = status.overall === 'healthy' ? '✅' : 
                     status.overall === 'degraded' ? '⚠️' : '❌';
        
        console.log(`${emoji} [PWA-HEALTH] Status geral: ${status.overall}`);
        console.log(`🔧 [PWA-HEALTH] Service Worker: ${status.serviceWorker}`);
        console.log(`💾 [PWA-HEALTH] Cache: ${status.cache}`);
        console.log(`🔄 [PWA-HEALTH] Updates: ${status.updates}`);
        console.log(`📱 [PWA-HEALTH] Offline: ${status.offline}`);

        if (status.issues.length > 0) {
            console.warn('⚠️ [PWA-HEALTH] Problemas detectados:', status.issues);
        }
    }

    /**
     * Força uma verificação manual de saúde
     */
    async forceHealthCheck(): Promise<PWAHealthStatus> {
        console.log('🔍 [PWA-HEALTH] Executando verificação manual de saúde...');
        return this.performHealthCheck();
    }

    /**
     * Obtém status atual de saúde
     */
    getCurrentHealthStatus(): PWAHealthStatus {
        return this.healthStatusSubject.value;
    }

    /**
     * Verifica se o PWA está saudável
     */
    isHealthy(): boolean {
        return this.healthStatusSubject.value.overall === 'healthy';
    }

    /**
     * Verifica se há problemas críticos
     */
    hasCriticalIssues(): boolean {
        const status = this.healthStatusSubject.value;
        return status.overall === 'unhealthy' || 
               status.serviceWorker === 'error' || 
               status.cache === 'failed';
    }

    /**
     * Obtém recomendações baseadas no status de saúde
     */
    getHealthRecommendations(): string[] {
        const status = this.healthStatusSubject.value;
        const recommendations: string[] = [];

        if (status.serviceWorker === 'inactive') {
            recommendations.push('Considere recarregar a página para ativar o Service Worker');
        }

        if (status.serviceWorker === 'error') {
            recommendations.push('Problemas com Service Worker detectados - funcionalidades offline podem estar limitadas');
        }

        if (status.cache === 'limited') {
            recommendations.push('Armazenamento limitado - limpe dados desnecessários do navegador');
        }

        if (status.cache === 'failed') {
            recommendations.push('Sistema de cache não está funcionando - performance pode estar reduzida');
        }

        if (status.updates === 'disabled') {
            recommendations.push('Sistema de atualizações não está ativo');
        }

        if (status.offline === 'limited') {
            recommendations.push('Suporte offline limitado - algumas funcionalidades podem não estar disponíveis sem internet');
        }

        return recommendations;
    }
}