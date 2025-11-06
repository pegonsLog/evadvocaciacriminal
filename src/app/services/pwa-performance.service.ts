import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cacheHitRatio: number;
  totalCachedResources: number;
  bundleSize?: number;
  networkRequests: number;
  timestamp: Date;
}

export interface CacheAnalysis {
  totalCaches: number;
  totalResources: number;
  cachesByType: { [key: string]: number };
  largestCache: { name: string; size: number };
  oldestCache: { name: string; age: number };
  efficiency: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface LoadTimeAnalysis {
  category: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  loadTime: number;
  recommendations: string[];
  breakdown: {
    dns: number;
    connection: number;
    request: number;
    response: number;
    domProcessing: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PWAPerformanceService {
  private metricsSubject = new BehaviorSubject<PerformanceMetrics | null>(null);
  public metrics$ = this.metricsSubject.asObservable();

  private performanceObserver?: PerformanceObserver;

  constructor() {
    this.initializePerformanceMonitoring();
    console.log('📊 [PWA-PERFORMANCE] Serviço de performance inicializado');
  }

  /**
   * Inicializa monitoramento de performance
   */
  private initializePerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          this.processPerformanceEntries(entries);
        });

        // Observa diferentes tipos de métricas
        this.performanceObserver.observe({ 
          entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'resource'] 
        });

        console.log('📊 [PWA-PERFORMANCE] Performance Observer ativo');
      } catch (error) {
        console.warn('⚠️ [PWA-PERFORMANCE] Erro ao inicializar Performance Observer:', error);
      }
    }
  }

  /**
   * Processa entradas de performance
   */
  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach(entry => {
      if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
        console.log(`🎨 [PWA-PERFORMANCE] First Contentful Paint: ${entry.startTime}ms`);
      }
      
      if (entry.entryType === 'largest-contentful-paint') {
        console.log(`🖼️ [PWA-PERFORMANCE] Largest Contentful Paint: ${entry.startTime}ms`);
      }
    });
  }

  /**
   * Mede métricas de performance atuais
   */
  async measurePerformance(): Promise<PerformanceMetrics> {
    console.log('📊 [PWA-PERFORMANCE] Medindo performance...');

    try {
      const timing = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      // Métricas básicas de carregamento
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;

      // Métricas de paint (se disponíveis)
      const paintEntries = performance.getEntriesByType('paint');
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime;

      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const largestContentfulPaint = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : undefined;

      // Análise de cache
      const cacheAnalysis = await this.analyzeCachePerformance();

      // Contagem de requisições de rede
      const resourceEntries = performance.getEntriesByType('resource');
      const networkRequests = resourceEntries.length;

      const metrics: PerformanceMetrics = {
        loadTime,
        domContentLoaded,
        firstContentfulPaint,
        largestContentfulPaint,
        cacheHitRatio: cacheAnalysis.efficiency === 'excellent' ? 0.9 : 
                      cacheAnalysis.efficiency === 'good' ? 0.7 :
                      cacheAnalysis.efficiency === 'fair' ? 0.5 : 0.3,
        totalCachedResources: cacheAnalysis.totalResources,
        networkRequests,
        timestamp: new Date()
      };

      this.metricsSubject.next(metrics);
      this.logPerformanceMetrics(metrics);

      return metrics;
    } catch (error) {
      console.error('❌ [PWA-PERFORMANCE] Erro ao medir performance:', error);
      throw error;
    }
  }

  /**
   * Analisa performance do cache
   */
  async analyzeCachePerformance(): Promise<CacheAnalysis> {
    try {
      const cacheNames = await caches.keys();
      let totalResources = 0;
      const cachesByType: { [key: string]: number } = {};
      let largestCache = { name: '', size: 0 };

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const cacheSize = keys.length;
        
        totalResources += cacheSize;

        // Categoriza cache por tipo
        if (cacheName.includes('ngsw:1:data')) {
          cachesByType['data'] = (cachesByType['data'] || 0) + cacheSize;
        } else if (cacheName.includes('ngsw:1:assets')) {
          cachesByType['assets'] = (cachesByType['assets'] || 0) + cacheSize;
        } else if (cacheName.includes('app')) {
          cachesByType['app'] = (cachesByType['app'] || 0) + cacheSize;
        } else {
          cachesByType['other'] = (cachesByType['other'] || 0) + cacheSize;
        }

        // Identifica maior cache
        if (cacheSize > largestCache.size) {
          largestCache = { name: cacheName, size: cacheSize };
        }
      }

      // Determina eficiência baseada no número de recursos em cache
      let efficiency: CacheAnalysis['efficiency'];
      if (totalResources > 50) efficiency = 'excellent';
      else if (totalResources > 25) efficiency = 'good';
      else if (totalResources > 10) efficiency = 'fair';
      else efficiency = 'poor';

      return {
        totalCaches: cacheNames.length,
        totalResources,
        cachesByType,
        largestCache,
        oldestCache: { name: 'N/A', age: 0 }, // Simplificado por ora
        efficiency
      };

    } catch (error) {
      console.error('❌ [PWA-PERFORMANCE] Erro ao analisar cache:', error);
      return {
        totalCaches: 0,
        totalResources: 0,
        cachesByType: {},
        largestCache: { name: '', size: 0 },
        oldestCache: { name: '', age: 0 },
        efficiency: 'poor'
      };
    }
  }

  /**
   * Analisa tempos de carregamento
   */
  analyzeLoadTimes(): LoadTimeAnalysis {
    const timing = performance.timing;
    
    const breakdown = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      connection: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      domProcessing: timing.domComplete - timing.domLoading
    };

    const totalLoadTime = timing.loadEventEnd - timing.navigationStart;

    let category: LoadTimeAnalysis['category'];
    const recommendations: string[] = [];

    if (totalLoadTime < 1000) {
      category = 'excellent';
    } else if (totalLoadTime < 2500) {
      category = 'good';
    } else if (totalLoadTime < 4000) {
      category = 'needs-improvement';
      recommendations.push('Considere otimizar recursos para melhorar tempo de carregamento');
    } else {
      category = 'poor';
      recommendations.push('Tempo de carregamento muito alto - otimização urgente necessária');
    }

    // Recomendações específicas baseadas no breakdown
    if (breakdown.dns > 200) {
      recommendations.push('DNS lookup lento - considere usar DNS mais rápido');
    }

    if (breakdown.connection > 500) {
      recommendations.push('Tempo de conexão alto - verifique latência do servidor');
    }

    if (breakdown.request > 300) {
      recommendations.push('Tempo de requisição alto - otimize servidor ou use CDN');
    }

    if (breakdown.response > 1000) {
      recommendations.push('Tempo de resposta alto - otimize tamanho dos recursos');
    }

    if (breakdown.domProcessing > 1500) {
      recommendations.push('Processamento DOM lento - otimize JavaScript e CSS');
    }

    return {
      category,
      loadTime: totalLoadTime,
      recommendations,
      breakdown
    };
  }

  /**
   * Testa eficiência do cache comparando requisições
   */
  async testCacheEfficiency(): Promise<{ hitRatio: number; avgCacheTime: number; avgNetworkTime: number }> {
    const testUrls = [
      '/favicon.ico',
      '/assets/icons/LogoEvac192.png',
      '/manifest.json'
    ];

    let cacheHits = 0;
    let totalCacheTime = 0;
    let totalNetworkTime = 0;
    let networkRequests = 0;

    for (const url of testUrls) {
      try {
        // Testa acesso via cache
        const cacheStart = performance.now();
        const cacheResponse = await caches.match(url);
        const cacheTime = performance.now() - cacheStart;

        if (cacheResponse) {
          cacheHits++;
          totalCacheTime += cacheTime;
        }

        // Testa acesso via rede (com cache disabled)
        try {
          const networkStart = performance.now();
          await fetch(url, { cache: 'no-cache' });
          const networkTime = performance.now() - networkStart;
          
          totalNetworkTime += networkTime;
          networkRequests++;
        } catch {
          // Ignora erros de rede para este teste
        }

      } catch (error) {
        console.warn(`⚠️ [PWA-PERFORMANCE] Erro ao testar ${url}:`, error);
      }
    }

    const hitRatio = testUrls.length > 0 ? cacheHits / testUrls.length : 0;
    const avgCacheTime = cacheHits > 0 ? totalCacheTime / cacheHits : 0;
    const avgNetworkTime = networkRequests > 0 ? totalNetworkTime / networkRequests : 0;

    console.log(`📊 [PWA-PERFORMANCE] Cache hit ratio: ${(hitRatio * 100).toFixed(1)}%`);
    console.log(`📊 [PWA-PERFORMANCE] Avg cache time: ${avgCacheTime.toFixed(2)}ms`);
    console.log(`📊 [PWA-PERFORMANCE] Avg network time: ${avgNetworkTime.toFixed(2)}ms`);

    return { hitRatio, avgCacheTime, avgNetworkTime };
  }

  /**
   * Mede tempo de inicialização do Service Worker
   */
  async measureServiceWorkerStartup(): Promise<number> {
    if (!('serviceWorker' in navigator)) {
      return -1;
    }

    try {
      const startTime = performance.now();
      const registration = await navigator.serviceWorker.getRegistration();
      const endTime = performance.now();

      const startupTime = endTime - startTime;
      
      console.log(`🔧 [PWA-PERFORMANCE] Service Worker startup: ${startupTime.toFixed(2)}ms`);
      
      return startupTime;
    } catch (error) {
      console.error('❌ [PWA-PERFORMANCE] Erro ao medir startup do SW:', error);
      return -1;
    }
  }

  /**
   * Executa benchmark completo de performance
   */
  async runPerformanceBenchmark(): Promise<{
    metrics: PerformanceMetrics;
    cacheAnalysis: CacheAnalysis;
    loadTimeAnalysis: LoadTimeAnalysis;
    cacheEfficiency: { hitRatio: number; avgCacheTime: number; avgNetworkTime: number };
    serviceWorkerStartup: number;
  }> {
    console.log('🏁 [PWA-PERFORMANCE] Executando benchmark completo...');

    const [
      metrics,
      cacheAnalysis,
      cacheEfficiency,
      serviceWorkerStartup
    ] = await Promise.all([
      this.measurePerformance(),
      this.analyzeCachePerformance(),
      this.testCacheEfficiency(),
      this.measureServiceWorkerStartup()
    ]);

    const loadTimeAnalysis = this.analyzeLoadTimes();

    const benchmark = {
      metrics,
      cacheAnalysis,
      loadTimeAnalysis,
      cacheEfficiency,
      serviceWorkerStartup
    };

    this.logBenchmarkResults(benchmark);

    return benchmark;
  }

  /**
   * Faz log das métricas de performance
   */
  private logPerformanceMetrics(metrics: PerformanceMetrics): void {
    console.log('📊 [PWA-PERFORMANCE] Métricas de Performance:');
    console.log(`   ⏱️ Load Time: ${metrics.loadTime}ms`);
    console.log(`   📄 DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    
    if (metrics.firstContentfulPaint) {
      console.log(`   🎨 First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
    }
    
    if (metrics.largestContentfulPaint) {
      console.log(`   🖼️ Largest Contentful Paint: ${metrics.largestContentfulPaint}ms`);
    }
    
    console.log(`   💾 Cache Hit Ratio: ${(metrics.cacheHitRatio * 100).toFixed(1)}%`);
    console.log(`   📦 Cached Resources: ${metrics.totalCachedResources}`);
    console.log(`   🌐 Network Requests: ${metrics.networkRequests}`);
  }

  /**
   * Faz log dos resultados do benchmark
   */
  private logBenchmarkResults(benchmark: any): void {
    console.log('🏁 [PWA-PERFORMANCE] Resultados do Benchmark:');
    console.log(`   📊 Load Time Category: ${benchmark.loadTimeAnalysis.category}`);
    console.log(`   💾 Cache Efficiency: ${benchmark.cacheAnalysis.efficiency}`);
    console.log(`   🎯 Cache Hit Ratio: ${(benchmark.cacheEfficiency.hitRatio * 100).toFixed(1)}%`);
    console.log(`   🔧 SW Startup: ${benchmark.serviceWorkerStartup.toFixed(2)}ms`);

    if (benchmark.loadTimeAnalysis.recommendations.length > 0) {
      console.log('💡 [PWA-PERFORMANCE] Recomendações:');
      benchmark.loadTimeAnalysis.recommendations.forEach((rec: string) => {
        console.log(`   - ${rec}`);
      });
    }
  }

  /**
   * Obtém métricas atuais
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metricsSubject.value;
  }

  /**
   * Limpa observer de performance
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      console.log('📊 [PWA-PERFORMANCE] Performance Observer desconectado');
    }
  }
}