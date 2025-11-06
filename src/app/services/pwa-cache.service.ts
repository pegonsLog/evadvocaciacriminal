import { Injectable, inject } from '@angular/core';
import { CacheService } from './cache.service';
import { PWAErrorHandlerService } from './pwa-error-handler.service';

export interface PWACacheConfig {
    clientesCacheTTL: number;
    parcelasCacheTTL: number;
    pagamentosCacheTTL: number;
    resumosCacheTTL: number;
    maxCacheSize: number;
    enableOfflineMode: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class PWACacheService {
    private cacheService = inject(CacheService);
    private errorHandler = inject(PWAErrorHandlerService);

    private readonly defaultConfig: PWACacheConfig = {
        clientesCacheTTL: 15 * 60 * 1000, // 15 minutos
        parcelasCacheTTL: 12 * 60 * 1000, // 12 minutos
        pagamentosCacheTTL: 10 * 60 * 1000, // 10 minutos
        resumosCacheTTL: 5 * 60 * 1000, // 5 minutos
        maxCacheSize: 500,
        enableOfflineMode: true
    };

    private config: PWACacheConfig = { ...this.defaultConfig };

    constructor() {
        this.initializePWACache();
    }

    /**
     * Inicializa configurações específicas do PWA para cache
     */
    private initializePWACache(): void {
        try {
            this.cacheService.configure({
                ttl: this.config.clientesCacheTTL,
                maxSize: this.config.maxCacheSize,
                enableOfflineMode: this.config.enableOfflineMode
            });

            // Configurar limpeza automática de cache expirado
            this.scheduleAutomaticCleanup();
        } catch (error) {
            console.error('❌ [PWA-CACHE] Erro ao inicializar cache PWA:', error);
            this.errorHandler.handleCacheError(
                error as Error,
                'initialize',
                { config: this.config }
            );
        }
    }

    /**
     * Configura políticas de cache específicas para PWA
     */
    configurePWACache(config: Partial<PWACacheConfig>): void {
        this.config = { ...this.config, ...config };

        this.cacheService.configure({
            ttl: this.config.clientesCacheTTL,
            maxSize: this.config.maxCacheSize,
            enableOfflineMode: this.config.enableOfflineMode
        });
    }

    /**
     * Obtém TTL específico para cada tipo de dados críticos
     */
    getTTLForDataType(dataType: 'clientes' | 'parcelas' | 'pagamentos' | 'resumos'): number {
        switch (dataType) {
            case 'clientes':
                return this.config.clientesCacheTTL;
            case 'parcelas':
                return this.config.parcelasCacheTTL;
            case 'pagamentos':
                return this.config.pagamentosCacheTTL;
            case 'resumos':
                return this.config.resumosCacheTTL;
            default:
                return this.config.clientesCacheTTL;
        }
    }

    /**
     * Invalida cache relacionado a um cliente específico
     */
    invalidateClienteCache(clienteId: string): void {
        try {
            this.cacheService.delete(`cliente_${clienteId}`);
            this.cacheService.delete(`parcelas_cliente_${clienteId}`);
            this.cacheService.delete(`pagamentos_cliente_${clienteId}`);
            this.cacheService.delete(`resumo_pagamento_${clienteId}`);
            this.cacheService.invalidatePattern('clientes_.*');
        } catch (error) {
            console.error('❌ [PWA-CACHE] Erro ao invalidar cache do cliente:', error);
            this.errorHandler.handleCacheError(
                error as Error,
                'invalidate',
                { clienteId }
            );
        }
    }

    /**
     * Invalida todo o cache de dados críticos
     */
    invalidateAllCriticalData(): void {
        try {
            this.cacheService.invalidatePattern('clientes_.*');
            this.cacheService.invalidatePattern('parcelas_.*');
            this.cacheService.invalidatePattern('pagamentos_.*');
            this.cacheService.invalidatePattern('resumo_.*');
        } catch (error) {
            console.error('❌ [PWA-CACHE] Erro ao invalidar todos os dados críticos:', error);
            this.errorHandler.handleCacheError(
                error as Error,
                'invalidateAll',
                { operation: 'invalidateAllCriticalData' }
            );
        }
    }

    /**
     * Pré-carrega dados críticos no cache
     */
    preloadCriticalData(): void {
        // Esta função pode ser chamada durante a inicialização do PWA
        // para garantir que dados críticos estejam disponíveis offline
        console.log('🔄 [PWA-CACHE] Pré-carregando dados críticos...');

        // Os dados serão carregados quando os serviços forem chamados
        // com os métodos *WithCache()
    }

    /**
     * Obtém estatísticas do cache para dados críticos
     */
    getCacheStats(): {
        totalEntries: number;
        criticalDataEntries: number;
        cacheHitRatio: number;
        offlineModeEnabled: boolean;
    } {
        const cacheInfo = this.cacheService.getCacheInfo();
        const criticalDataEntries = cacheInfo.entries.filter(entry =>
            entry.key.includes('cliente') ||
            entry.key.includes('parcela') ||
            entry.key.includes('pagamento') ||
            entry.key.includes('resumo')
        ).length;

        return {
            totalEntries: cacheInfo.size,
            criticalDataEntries,
            cacheHitRatio: this.calculateCacheHitRatio(),
            offlineModeEnabled: this.config.enableOfflineMode
        };
    }

    /**
     * Limpa dados expirados e otimiza cache
     */
    optimizeCache(): number {
        const cleanedEntries = this.cacheService.cleanExpiredEntries();
        console.log(`🧹 [PWA-CACHE] Limpeza automática: ${cleanedEntries} entradas removidas`);
        return cleanedEntries;
    }

    /**
     * Agenda limpeza automática do cache
     */
    private scheduleAutomaticCleanup(): void {
        // Limpar cache expirado a cada 30 minutos
        setInterval(() => {
            this.optimizeCache();
        }, 30 * 60 * 1000);
    }

    /**
     * Calcula taxa de acerto do cache (simulado)
     */
    private calculateCacheHitRatio(): number {
        // Em uma implementação real, isso seria baseado em métricas coletadas
        // Por enquanto, retornamos um valor estimado baseado no tamanho do cache
        const cacheInfo = this.cacheService.getCacheInfo();
        const utilizationRatio = cacheInfo.size / this.config.maxCacheSize;
        return Math.min(utilizationRatio * 0.8, 0.95); // Máximo de 95%
    }

    /**
     * Verifica se o modo offline está ativo
     */
    isOfflineModeEnabled(): boolean {
        return this.config.enableOfflineMode;
    }

    /**
     * Força sincronização de dados críticos
     */
    forceSyncCriticalData(): void {
        console.log('🔄 [PWA-CACHE] Forçando sincronização de dados críticos...');
        this.invalidateAllCriticalData();
        this.preloadCriticalData();
    }
}
