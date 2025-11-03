import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, debounceTime } from 'rxjs/operators';

export interface PaginationConfig {
    pageSize: number;
    currentPage: number;
    totalItems: number;
}

export interface LazyLoadConfig {
    enabled: boolean;
    threshold: number; // Número de pixels antes do final para carregar mais
    batchSize: number; // Quantidade de itens a carregar por vez
}

export interface VirtualScrollConfig {
    itemHeight: number;
    containerHeight: number;
    bufferSize: number; // Número de itens extras para renderizar fora da viewport
}

@Injectable({
    providedIn: 'root'
})
export class LazyLoadingService {
    private readonly DEFAULT_PAGE_SIZE = 20;
    private readonly DEFAULT_LAZY_THRESHOLD = 200; // pixels
    private readonly DEFAULT_BATCH_SIZE = 10;
    private readonly DEFAULT_ITEM_HEIGHT = 60; // pixels
    private readonly DEFAULT_BUFFER_SIZE = 5;

    /**
     * Cria um observable para paginação de dados
     */
    createPaginatedData<T>(
        data$: Observable<T[]>,
        pageSize: number = this.DEFAULT_PAGE_SIZE
    ): {
        paginatedData$: Observable<T[]>;
        pagination$: Observable<PaginationConfig>;
        setPage: (page: number) => void;
        setPageSize: (size: number) => void;
    } {
        const currentPageSubject = new BehaviorSubject<number>(1);
        const pageSizeSubject = new BehaviorSubject<number>(pageSize);

        const pagination$ = combineLatest([
            data$,
            currentPageSubject.asObservable(),
            pageSizeSubject.asObservable()
        ]).pipe(
            map(([data, currentPage, currentPageSize]) => ({
                pageSize: currentPageSize,
                currentPage,
                totalItems: data.length
            })),
            distinctUntilChanged((prev, curr) =>
                prev.pageSize === curr.pageSize &&
                prev.currentPage === curr.currentPage &&
                prev.totalItems === curr.totalItems
            )
        );

        const paginatedData$ = combineLatest([
            data$,
            currentPageSubject.asObservable(),
            pageSizeSubject.asObservable()
        ]).pipe(
            debounceTime(100), // Evitar múltiplas atualizações rápidas
            map(([data, currentPage, currentPageSize]) => {
                const startIndex = (currentPage - 1) * currentPageSize;
                const endIndex = startIndex + currentPageSize;
                return data.slice(startIndex, endIndex);
            })
        );

        return {
            paginatedData$,
            pagination$,
            setPage: (page: number) => {
                if (page >= 1) {
                    currentPageSubject.next(page);
                }
            },
            setPageSize: (size: number) => {
                if (size > 0) {
                    pageSizeSubject.next(size);
                    currentPageSubject.next(1); // Reset para primeira página
                }
            }
        };
    }

    /**
     * Cria um observable para lazy loading incremental
     */
    createLazyLoadedData<T>(
        data$: Observable<T[]>,
        config: Partial<LazyLoadConfig> = {}
    ): {
        visibleData$: Observable<T[]>;
        loadMore: () => void;
        hasMore$: Observable<boolean>;
        loading$: Observable<boolean>;
        reset: () => void;
    } {
        const finalConfig: LazyLoadConfig = {
            enabled: true,
            threshold: this.DEFAULT_LAZY_THRESHOLD,
            batchSize: this.DEFAULT_BATCH_SIZE,
            ...config
        };

        const loadedCountSubject = new BehaviorSubject<number>(finalConfig.batchSize);
        const loadingSubject = new BehaviorSubject<boolean>(false);

        const visibleData$ = combineLatest([
            data$,
            loadedCountSubject.asObservable()
        ]).pipe(
            map(([data, loadedCount]) => data.slice(0, loadedCount))
        );

        const hasMore$ = combineLatest([
            data$,
            loadedCountSubject.asObservable()
        ]).pipe(
            map(([data, loadedCount]) => loadedCount < data.length)
        );

        return {
            visibleData$,
            loadMore: () => {
                if (!finalConfig.enabled) return;

                loadingSubject.next(true);

                // Simular delay de carregamento
                setTimeout(() => {
                    const currentCount = loadedCountSubject.value;
                    loadedCountSubject.next(currentCount + finalConfig.batchSize);
                    loadingSubject.next(false);
                }, 100);
            },
            hasMore$,
            loading$: loadingSubject.asObservable(),
            reset: () => {
                loadedCountSubject.next(finalConfig.batchSize);
                loadingSubject.next(false);
            }
        };
    }

    /**
     * Cria configuração para virtual scrolling
     */
    createVirtualScrollConfig(
        totalItems: number,
        config: Partial<VirtualScrollConfig> = {}
    ): {
        config: VirtualScrollConfig;
        getVisibleRange: (scrollTop: number) => { start: number; end: number };
        getTotalHeight: () => number;
        getItemPosition: (index: number) => number;
    } {
        const finalConfig: VirtualScrollConfig = {
            itemHeight: this.DEFAULT_ITEM_HEIGHT,
            containerHeight: 400,
            bufferSize: this.DEFAULT_BUFFER_SIZE,
            ...config
        };

        const getVisibleRange = (scrollTop: number) => {
            const visibleStart = Math.floor(scrollTop / finalConfig.itemHeight);
            const visibleEnd = Math.min(
                visibleStart + Math.ceil(finalConfig.containerHeight / finalConfig.itemHeight),
                totalItems
            );

            // Adicionar buffer
            const start = Math.max(0, visibleStart - finalConfig.bufferSize);
            const end = Math.min(totalItems, visibleEnd + finalConfig.bufferSize);

            return { start, end };
        };

        return {
            config: finalConfig,
            getVisibleRange,
            getTotalHeight: () => totalItems * finalConfig.itemHeight,
            getItemPosition: (index: number) => index * finalConfig.itemHeight
        };
    }

    /**
     * Otimiza carregamento baseado na visibilidade do elemento
     */
    createIntersectionObserver(
        callback: (isVisible: boolean) => void,
        options: IntersectionObserverInit = {}
    ): {
        observer: IntersectionObserver;
        observe: (element: Element) => void;
        unobserve: (element: Element) => void;
        disconnect: () => void;
    } {
        const defaultOptions: IntersectionObserverInit = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                callback(entry.isIntersecting);
            });
        }, defaultOptions);

        return {
            observer,
            observe: (element: Element) => observer.observe(element),
            unobserve: (element: Element) => observer.unobserve(element),
            disconnect: () => observer.disconnect()
        };
    }

    /**
     * Cria um sistema de carregamento progressivo para gráficos
     */
    createProgressiveChartLoading<T>(
        chartData$: Observable<T[]>,
        priority: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low']
    ): {
        loadChart: (chartId: string, priorityLevel: 'high' | 'medium' | 'low') => Observable<T[]>;
        preloadCharts: (chartIds: string[]) => void;
        getLoadingStatus: (chartId: string) => Observable<'loading' | 'loaded' | 'error'>;
    } {
        const loadingStatus = new Map<string, BehaviorSubject<'loading' | 'loaded' | 'error'>>();
        const chartCache = new Map<string, T[]>();
        const loadingQueue = new Map<'high' | 'medium' | 'low', string[]>();

        // Inicializar filas de prioridade
        priority.forEach(p => loadingQueue.set(p, []));

        const processQueue = () => {
            for (const priorityLevel of priority) {
                const queue = loadingQueue.get(priorityLevel);
                if (queue && queue.length > 0) {
                    const chartId = queue.shift()!;
                    this.loadChartData(chartId, chartData$, loadingStatus, chartCache);
                    break; // Processar apenas um por vez
                }
            }
        };

        return {
            loadChart: (chartId: string, priorityLevel: 'high' | 'medium' | 'low') => {
                if (!loadingStatus.has(chartId)) {
                    loadingStatus.set(chartId, new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading'));
                }

                if (chartCache.has(chartId)) {
                    loadingStatus.get(chartId)!.next('loaded');
                    return new BehaviorSubject(chartCache.get(chartId)!).asObservable();
                }

                // Adicionar à fila de prioridade
                const queue = loadingQueue.get(priorityLevel);
                if (queue && !queue.includes(chartId)) {
                    queue.push(chartId);
                    setTimeout(processQueue, 0); // Processar na próxima iteração
                }

                return chartData$;
            },
            preloadCharts: (chartIds: string[]) => {
                chartIds.forEach(chartId => {
                    const queue = loadingQueue.get('low');
                    if (queue && !queue.includes(chartId) && !chartCache.has(chartId)) {
                        queue.push(chartId);
                    }
                });
                setTimeout(processQueue, 0);
            },
            getLoadingStatus: (chartId: string) => {
                if (!loadingStatus.has(chartId)) {
                    loadingStatus.set(chartId, new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading'));
                }
                return loadingStatus.get(chartId)!.asObservable();
            }
        };
    }

    /**
     * Otimiza performance de listas grandes com debounce
     */
    createOptimizedListFilter<T>(
        data$: Observable<T[]>,
        filterFn: (item: T, searchTerm: string) => boolean,
        debounceMs: number = 300
    ): {
        filteredData$: Observable<T[]>;
        setSearchTerm: (term: string) => void;
        clearSearch: () => void;
    } {
        const searchTermSubject = new BehaviorSubject<string>('');

        const filteredData$ = combineLatest([
            data$,
            searchTermSubject.pipe(debounceTime(debounceMs))
        ]).pipe(
            map(([data, searchTerm]) => {
                if (!searchTerm.trim()) {
                    return data;
                }
                return data.filter(item => filterFn(item, searchTerm.toLowerCase()));
            })
        );

        return {
            filteredData$,
            setSearchTerm: (term: string) => searchTermSubject.next(term),
            clearSearch: () => searchTermSubject.next('')
        };
    }

    /**
     * Métodos privados
     */

    private loadChartData<T>(
        chartId: string,
        chartData$: Observable<T[]>,
        loadingStatus: Map<string, BehaviorSubject<'loading' | 'loaded' | 'error'>>,
        chartCache: Map<string, T[]>
    ): void {
        const statusSubject = loadingStatus.get(chartId);
        if (!statusSubject) return;

        statusSubject.next('loading');

        chartData$.subscribe({
            next: (data) => {
                chartCache.set(chartId, data);
                statusSubject.next('loaded');
            },
            error: () => {
                statusSubject.next('error');
            }
        });
    }
}
