import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, switchMap, debounceTime, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { LazyLoadingService, PaginationConfig } from './lazy-loading.service';
import { ContratoResumo, FiltrosRelatorio } from '../models/relatorio.model';

export interface PerformanceMetrics {
    loadTime: number;
    dataSize: number;
    renderTime: number;
    memoryUsage: number;
}

export interface OptimizationConfig {
    enableVirtualScrolling: boolean;
    enableLazyLoading: boolean;
    enablePagination: boolean;
    pageSize: number;
    lazyLoadThreshold: number;
    debounceTime: number;
}

@Injectable({
    providedIn: 'root'
})
export class RelatorioPerformanceService {
    private lazyLoadingService = inject(LazyLoadingService);

    private readonly DEFAULT_CONFIG: OptimizationConfig = {
        enableVirtualScrolling: true,
        enableLazyLoading: true,
        enablePagination: true,
        pageSize: 25,
        lazyLoadThreshold: 100,
        debounceTime: 300
    };

    private performanceMetrics = new BehaviorSubject<PerformanceMetrics>({
        loadTime: 0,
        dataSize: 0,
        renderTime: 0,
        memoryUsage: 0
    });

    private config = new BehaviorSubject<OptimizationConfig>(this.DEFAULT_CONFIG);

    /**
     * Configura otimizações de performance
     */
    configure(newConfig: Partial<OptimizationConfig>): void {
        const currentConfig = this.config.value;
        this.config.next({ ...currentConfig, ...newConfig });
    }

    /**
     * Cria lista otimizada de contratos com paginação e lazy loading
     */
    createOptimizedContractList(
        contratos$: Observable<ContratoResumo[]>,
        filtros$: Observable<FiltrosRelatorio>
    ): {
        paginatedContratos$: Observable<ContratoResumo[]>;
        pagination$: Observable<PaginationConfig>;
        totalCount$: Observable<number>;
        setPage: (page: number) => void;
        setPageSize: (size: number) => void;
        performanceMetrics$: Observable<PerformanceMetrics>;
    } {
        const startTime = performance.now();

        // Aplicar filtros com debounce para evitar múltiplas atualizações
        const filteredContratos$ = combineLatest([
            contratos$,
            filtros$.pipe(
                debounceTime(this.config.value.debounceTime),
                distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
            )
        ]).pipe(
            map(([contratos, filtros]) => {
                const filtered = this.applyContractFilters(contratos, filtros);

                // Atualizar métricas de performance
                this.updatePerformanceMetrics({
                    loadTime: performance.now() - startTime,
                    dataSize: filtered.length,
                    renderTime: 0,
                    memoryUsage: this.estimateMemoryUsage(filtered)
                });

                return filtered;
            }),
            shareReplay(1) // Cache do resultado para múltiplas subscrições
        );

        // Criar paginação otimizada
        const paginationResult = this.lazyLoadingService.createPaginatedData(
            filteredContratos$,
            this.config.value.pageSize
        );

        const totalCount$ = filteredContratos$.pipe(
            map(contratos => contratos.length)
        );

        return {
            paginatedContratos$: paginationResult.paginatedData$,
            pagination$: paginationResult.pagination$,
            totalCount$,
            setPage: paginationResult.setPage,
            setPageSize: paginationResult.setPageSize,
            performanceMetrics$: this.performanceMetrics.asObservable()
        };
    }

    /**
     * Cria carregamento lazy para gráficos baseado na visibilidade
     */
    createLazyChartLoader(): {
        registerChart: (chartId: string, loadFn: () => Observable<any>) => Observable<any>;
        preloadChart: (chartId: string) => void;
        getChartStatus: (chartId: string) => Observable<'loading' | 'loaded' | 'error'>;
        unregisterChart: (chartId: string) => void;
    } {
        const chartLoaders = new Map<string, () => Observable<any>>();
        const chartData = new Map<string, BehaviorSubject<any>>();
        const chartStatus = new Map<string, BehaviorSubject<'loading' | 'loaded' | 'error'>>();
        const loadedCharts = new Set<string>();

        return {
            registerChart: (chartId: string, loadFn: () => Observable<any>) => {
                chartLoaders.set(chartId, loadFn);

                if (!chartData.has(chartId)) {
                    chartData.set(chartId, new BehaviorSubject(null));
                    chartStatus.set(chartId, new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading'));
                }

                return chartData.get(chartId)!.asObservable();
            },
            preloadChart: (chartId: string) => {
                if (loadedCharts.has(chartId)) return;

                const loadFn = chartLoaders.get(chartId);
                const dataSubject = chartData.get(chartId);
                const statusSubject = chartStatus.get(chartId);

                if (loadFn && dataSubject && statusSubject) {
                    statusSubject.next('loading');

                    loadFn().subscribe({
                        next: (data) => {
                            dataSubject.next(data);
                            statusSubject.next('loaded');
                            loadedCharts.add(chartId);
                        },
                        error: () => {
                            statusSubject.next('error');
                        }
                    });
                }
            },
            getChartStatus: (chartId: string) => {
                if (!chartStatus.has(chartId)) {
                    chartStatus.set(chartId, new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading'));
                }
                return chartStatus.get(chartId)!.asObservable();
            },
            unregisterChart: (chartId: string) => {
                chartLoaders.delete(chartId);
                chartData.delete(chartId);
                chartStatus.delete(chartId);
                loadedCharts.delete(chartId);
            }
        };
    }

    /**
     * Cria virtual scrolling para listas grandes
     */
    createVirtualScrolling<T>(
        items$: Observable<T[]>,
        itemHeight: number = 60,
        containerHeight: number = 400
    ): {
        visibleItems$: Observable<T[]>;
        totalHeight$: Observable<number>;
        updateScrollPosition: (scrollTop: number) => void;
        getItemPosition: (index: number) => number;
    } {
        const scrollPositionSubject = new BehaviorSubject<number>(0);

        const visibleItems$ = combineLatest([
            items$,
            scrollPositionSubject.asObservable()
        ]).pipe(
            map(([items, scrollTop]) => {
                const startIndex = Math.floor(scrollTop / itemHeight);
                const endIndex = Math.min(
                    startIndex + Math.ceil(containerHeight / itemHeight) + 2, // Buffer de 2 itens
                    items.length
                );

                return items.slice(Math.max(0, startIndex - 1), endIndex);
            })
        );

        const totalHeight$ = items$.pipe(
            map(items => items.length * itemHeight)
        );

        return {
            visibleItems$,
            totalHeight$,
            updateScrollPosition: (scrollTop: number) => scrollPositionSubject.next(scrollTop),
            getItemPosition: (index: number) => index * itemHeight
        };
    }

    /**
     * Otimiza filtros com debounce e cache
     */
    createOptimizedFilter<T>(
        data$: Observable<T[]>,
        filterFn: (items: T[], searchTerm: string) => T[],
        debounceMs: number = 300
    ): {
        filteredData$: Observable<T[]>;
        setFilter: (searchTerm: string) => void;
        clearFilter: () => void;
        isFiltering$: Observable<boolean>;
    } {
        const filterTermSubject = new BehaviorSubject<string>('');
        const isFilteringSubject = new BehaviorSubject<boolean>(false);

        const filteredData$ = combineLatest([
            data$,
            filterTermSubject.pipe(
                debounceTime(debounceMs),
                distinctUntilChanged()
            )
        ]).pipe(
            map(([data, filterTerm]) => {
                isFilteringSubject.next(!!filterTerm);

                if (!filterTerm.trim()) {
                    return data;
                }

                const startTime = performance.now();
                const filtered = filterFn(data, filterTerm);
                const filterTime = performance.now() - startTime;

                // Log performance se filtro demorar muito
                if (filterTime > 100) {
                    console.warn(`Filtro demorou ${filterTime.toFixed(2)}ms para processar ${data.length} itens`);
                }

                return filtered;
            }),
            shareReplay(1)
        );

        return {
            filteredData$,
            setFilter: (searchTerm: string) => filterTermSubject.next(searchTerm),
            clearFilter: () => filterTermSubject.next(''),
            isFiltering$: isFilteringSubject.asObservable()
        };
    }

    /**
     * Monitora performance e sugere otimizações
     */
    getPerformanceRecommendations(): Observable<string[]> {
        return this.performanceMetrics.pipe(
            map(metrics => {
                const recommendations: string[] = [];

                if (metrics.loadTime > 2000) {
                    recommendations.push('Considere habilitar cache para reduzir tempo de carregamento');
                }

                if (metrics.dataSize > 1000) {
                    recommendations.push('Lista grande detectada - habilite paginação ou virtual scrolling');
                }

                if (metrics.renderTime > 500) {
                    recommendations.push('Tempo de renderização alto - considere lazy loading para gráficos');
                }

                if (metrics.memoryUsage > 50) {
                    recommendations.push('Alto uso de memória - implemente limpeza de dados não utilizados');
                }

                return recommendations;
            })
        );
    }

    /**
     * Obtém métricas de performance atuais
     */
    getCurrentMetrics(): Observable<PerformanceMetrics> {
        return this.performanceMetrics.asObservable();
    }

    /**
     * Métodos privados
     */

    private applyContractFilters(contratos: ContratoResumo[], filtros: FiltrosRelatorio): ContratoResumo[] {
        let filtered = [...contratos];

        // Filtro por cliente
        if (filtros.clienteId) {
            filtered = filtered.filter(c => c.clienteId === filtros.clienteId);
        }

        // Filtro por status
        if (filtros.statusPagamento && filtros.statusPagamento.length > 0) {
            filtered = filtered.filter(c => {
                const status = c.statusGeral === 'em_dia' ? 'pendente' :
                    c.statusGeral === 'atrasado' ? 'atrasado' : 'pago';
                return filtros.statusPagamento!.includes(status as any);
            });
        }

        // Filtro por valor
        if (filtros.valorMinimo !== undefined) {
            filtered = filtered.filter(c => c.valorTotal >= filtros.valorMinimo!);
        }

        if (filtros.valorMaximo !== undefined) {
            filtered = filtered.filter(c => c.valorTotal <= filtros.valorMaximo!);
        }

        // Filtro por data (próximo vencimento)
        if (filtros.dataInicio || filtros.dataFim) {
            filtered = filtered.filter(c => {
                if (!c.proximoVencimento) return false;

                if (filtros.dataInicio && c.proximoVencimento < filtros.dataInicio) {
                    return false;
                }

                if (filtros.dataFim && c.proximoVencimento > filtros.dataFim) {
                    return false;
                }

                return true;
            });
        }

        return filtered;
    }

    private updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
        const current = this.performanceMetrics.value;
        this.performanceMetrics.next({ ...current, ...metrics });
    }

    private estimateMemoryUsage(data: any[]): number {
        // Estimativa simples baseada no tamanho dos dados
        const avgItemSize = 2; // KB por item (estimativa)
        return data.length * avgItemSize;
    }
}
