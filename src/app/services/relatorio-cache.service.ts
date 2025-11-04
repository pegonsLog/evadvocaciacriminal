import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CacheService } from './cache.service';
import { DadosRelatorio, FiltrosRelatorio, MetricasGerais, DadosGraficos } from '../models/relatorio.model';

@Injectable({
    providedIn: 'root'
})
export class RelatorioCacheService {
    private cacheService = inject(CacheService);

    // TTL específicos para diferentes tipos de dados (em milissegundos)
    private readonly TTL_CONFIG = {
        DADOS_COMPLETOS: 5 * 60 * 1000,      // 5 minutos para dados completos
        METRICAS_GERAIS: 3 * 60 * 1000,      // 3 minutos para métricas
        DADOS_GRAFICOS: 10 * 60 * 1000,      // 10 minutos para gráficos
        LISTA_CONTRATOS: 2 * 60 * 1000,      // 2 minutos para lista de contratos
        ALERTAS: 1 * 60 * 1000,              // 1 minuto para alertas (mais críticos)
        DADOS_CLIENTE: 15 * 60 * 1000        // 15 minutos para dados específicos do cliente
    };

    constructor() {
        // Configurar o cache service com parâmetros específicos para relatórios
        this.cacheService.configure({
            ttl: this.TTL_CONFIG.DADOS_COMPLETOS,
            maxSize: 50, // Menor que o padrão pois dados de relatório são maiores
            enableOfflineMode: true
        });

        // Configurar limpeza automática de cache expirado a cada 2 minutos
        setInterval(() => {
            this.cacheService.cleanExpiredEntries();
        }, 2 * 60 * 1000);
    }

    /**
     * Obtém dados completos do relatório com cache
     */
    getDadosRelatorio(
        filtros: FiltrosRelatorio,
        usuarioId: string | undefined,
        fetchFn: () => Observable<DadosRelatorio>
    ): Observable<DadosRelatorio> {
        const cacheKey = this.generateRelatorioCacheKey(filtros, usuarioId);
        return this.cacheService.get(
            cacheKey,
            fetchFn,
            this.TTL_CONFIG.DADOS_COMPLETOS
        );
    }

    /**
     * Obtém métricas gerais com cache
     */
    getMetricasGerais(
        filtros: FiltrosRelatorio,
        usuarioId: string | undefined,
        fetchFn: () => Observable<MetricasGerais>
    ): Observable<MetricasGerais> {
        const cacheKey = this.generateMetricasCacheKey(filtros, usuarioId);
        return this.cacheService.get(
            cacheKey,
            fetchFn,
            this.TTL_CONFIG.METRICAS_GERAIS
        );
    }

    /**
     * Obtém dados de gráficos com cache
     */
    getDadosGraficos(
        filtros: FiltrosRelatorio,
        usuarioId: string | undefined,
        fetchFn: () => Observable<DadosGraficos>
    ): Observable<DadosGraficos> {
        const cacheKey = this.generateGraficosCacheKey(filtros, usuarioId);
        return this.cacheService.get(
            cacheKey,
            fetchFn,
            this.TTL_CONFIG.DADOS_GRAFICOS
        );
    }

    /**
     * Obtém dados específicos do cliente com cache de longa duração
     */
    getDadosCliente(
        clienteId: string,
        fetchFn: () => Observable<any>
    ): Observable<any> {
        const cacheKey = `cliente_${clienteId}`;
        return this.cacheService.get(
            cacheKey,
            fetchFn,
            this.TTL_CONFIG.DADOS_CLIENTE
        );
    }

    /**
     * Invalida cache quando dados são modificados
     */
    invalidateOnDataChange(tipoMudanca: 'pagamento' | 'cliente' | 'parcela' | 'all', clienteId?: string): void {
        switch (tipoMudanca) {
            case 'pagamento':
                // Invalidar caches relacionados a pagamentos
                this.cacheService.invalidatePattern('relatorio_.*');
                this.cacheService.invalidatePattern('metricas_.*');
                this.cacheService.invalidatePattern('graficos_.*');
                if (clienteId) {
                    this.cacheService.delete(`cliente_${clienteId}`);
                }
                break;

            case 'cliente':
                // Invalidar todos os caches relacionados ao cliente
                if (clienteId) {
                    this.cacheService.invalidatePattern(`.*_${clienteId}_.*`);
                    this.cacheService.delete(`cliente_${clienteId}`);
                }
                this.cacheService.invalidatePattern('relatorio_.*');
                break;

            case 'parcela':
                // Invalidar caches de métricas e gráficos
                this.cacheService.invalidatePattern('metricas_.*');
                this.cacheService.invalidatePattern('graficos_.*');
                this.cacheService.invalidatePattern('relatorio_.*');
                if (clienteId) {
                    this.cacheService.delete(`cliente_${clienteId}`);
                }
                break;

            case 'all':
                // Limpar todo o cache
                this.cacheService.clear();
                break;
        }


    }

    /**
     * Pré-carrega dados no cache para melhorar performance
     */
    preloadCommonData(usuarioId: string | undefined, fetchFn: () => Observable<DadosRelatorio>): void {
        // Pré-carregar dados com filtros comuns
        const filtrosComuns: FiltrosRelatorio[] = [
            {}, // Sem filtros (dados gerais)
            { // Último mês
                dataInicio: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                dataFim: new Date()
            },
            { // Último trimestre
                dataInicio: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
                dataFim: new Date()
            }
        ];

        filtrosComuns.forEach(filtros => {
            const cacheKey = this.generateRelatorioCacheKey(filtros, usuarioId);
            if (!this.cacheService.has(cacheKey)) {
                this.getDadosRelatorio(filtros, usuarioId, fetchFn).subscribe({
                    next: () => { },
                    error: (error) => console.warn('Erro ao pré-carregar dados:', error)
                });
            }
        });
    }

    /**
     * Obtém estatísticas do cache para monitoramento
     */
    getCacheStats(): {
        info: ReturnType<CacheService['getCacheInfo']>;
        hitRate: number;
        memoryUsage: string;
    } {
        const info = this.cacheService.getCacheInfo();

        // Calcular taxa de acerto aproximada baseada nas entradas não expiradas
        const nonExpiredEntries = info.entries.filter(entry => !entry.expired);
        const hitRate = info.entries.length > 0
            ? (nonExpiredEntries.length / info.entries.length) * 100
            : 0;

        // Estimar uso de memória (aproximado)
        const avgEntrySize = 50; // KB estimado por entrada
        const memoryUsageKB = info.size * avgEntrySize;
        const memoryUsage = memoryUsageKB > 1024
            ? `${(memoryUsageKB / 1024).toFixed(2)} MB`
            : `${memoryUsageKB} KB`;

        return {
            info,
            hitRate: Math.round(hitRate),
            memoryUsage
        };
    }

    /**
     * Força a atualização de dados específicos
     */
    forceRefresh(filtros: FiltrosRelatorio, usuarioId: string | undefined): void {
        const cacheKey = this.generateRelatorioCacheKey(filtros, usuarioId);
        this.cacheService.delete(cacheKey);

        // Também invalidar caches relacionados
        this.cacheService.delete(this.generateMetricasCacheKey(filtros, usuarioId));
        this.cacheService.delete(this.generateGraficosCacheKey(filtros, usuarioId));
    }

    /**
     * Métodos privados para geração de chaves de cache
     */

    private generateRelatorioCacheKey(filtros: FiltrosRelatorio, usuarioId: string | undefined): string {
        const filtrosStr = this.serializeFiltros(filtros);
        const userStr = usuarioId || 'admin';
        return `relatorio_${userStr}_${filtrosStr}`;
    }

    private generateMetricasCacheKey(filtros: FiltrosRelatorio, usuarioId: string | undefined): string {
        const filtrosStr = this.serializeFiltros(filtros);
        const userStr = usuarioId || 'admin';
        return `metricas_${userStr}_${filtrosStr}`;
    }

    private generateGraficosCacheKey(filtros: FiltrosRelatorio, usuarioId: string | undefined): string {
        const filtrosStr = this.serializeFiltros(filtros);
        const userStr = usuarioId || 'admin';
        return `graficos_${userStr}_${filtrosStr}`;
    }

    private serializeFiltros(filtros: FiltrosRelatorio): string {
        // Criar uma string única baseada nos filtros
        const parts: string[] = [];

        if (filtros.dataInicio) {
            parts.push(`di_${filtros.dataInicio.getTime()}`);
        }
        if (filtros.dataFim) {
            parts.push(`df_${filtros.dataFim.getTime()}`);
        }
        if (filtros.clienteId) {
            parts.push(`ci_${filtros.clienteId}`);
        }
        if (filtros.statusPagamento && filtros.statusPagamento.length > 0) {
            parts.push(`st_${filtros.statusPagamento.sort().join(',')}`);
        }
        if (filtros.valorMinimo !== undefined) {
            parts.push(`vmin_${filtros.valorMinimo}`);
        }
        if (filtros.valorMaximo !== undefined) {
            parts.push(`vmax_${filtros.valorMaximo}`);
        }

        return parts.length > 0 ? parts.join('_') : 'no_filters';
    }
}
