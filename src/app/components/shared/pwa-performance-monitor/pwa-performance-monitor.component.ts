import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PWAPerformanceService, PerformanceMetrics, CacheAnalysis, LoadTimeAnalysis } from '../../../services/pwa-performance.service';
import { PWAHealthCheckService, PWAHealthStatus } from '../../../services/pwa-health-check.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-pwa-performance-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="performance-monitor-container">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="bi bi-speedometer2"></i>
            Monitor de Performance PWA
          </h5>
          <div class="btn-group">
            <button 
              class="btn btn-primary btn-sm" 
              (click)="runBenchmark()"
              [disabled]="isRunningBenchmark">
              <i class="bi bi-play-fill" [class.spin]="isRunningBenchmark"></i>
              {{ isRunningBenchmark ? 'Executando...' : 'Executar Benchmark' }}
            </button>
            <button 
              class="btn btn-outline-secondary btn-sm" 
              (click)="toggleAutoRefresh()">
              <i class="bi" [ngClass]="autoRefresh ? 'bi-pause-fill' : 'bi-arrow-clockwise'"></i>
              {{ autoRefresh ? 'Pausar' : 'Auto Refresh' }}
            </button>
          </div>
        </div>

        <div class="card-body">
          <!-- Métricas Principais -->
          <div *ngIf="currentMetrics" class="main-metrics mb-4">
            <div class="row">
              <div class="col-md-3">
                <div class="metric-card" [ngClass]="getLoadTimeClass(currentMetrics.loadTime)">
                  <div class="metric-icon">
                    <i class="bi bi-stopwatch"></i>
                  </div>
                  <div class="metric-content">
                    <div class="metric-value">{{ currentMetrics.loadTime }}ms</div>
                    <div class="metric-label">Load Time</div>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="metric-card" [ngClass]="getCacheHitClass(currentMetrics.cacheHitRatio)">
                  <div class="metric-icon">
                    <i class="bi bi-hdd-stack"></i>
                  </div>
                  <div class="metric-content">
                    <div class="metric-value">{{ (currentMetrics.cacheHitRatio * 100).toFixed(1) }}%</div>
                    <div class="metric-label">Cache Hit Ratio</div>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="metric-card">
                  <div class="metric-icon">
                    <i class="bi bi-files"></i>
                  </div>
                  <div class="metric-content">
                    <div class="metric-value">{{ currentMetrics.totalCachedResources }}</div>
                    <div class="metric-label">Cached Resources</div>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="metric-card">
                  <div class="metric-icon">
                    <i class="bi bi-globe"></i>
                  </div>
                  <div class="metric-content">
                    <div class="metric-value">{{ currentMetrics.networkRequests }}</div>
                    <div class="metric-label">Network Requests</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Análise de Cache -->
          <div *ngIf="cacheAnalysis" class="cache-analysis mb-4">
            <h6>Análise de Cache</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="cache-summary">
                  <div class="cache-item">
                    <span class="cache-label">Total de Caches:</span>
                    <span class="cache-value">{{ cacheAnalysis.totalCaches }}</span>
                  </div>
                  <div class="cache-item">
                    <span class="cache-label">Total de Recursos:</span>
                    <span class="cache-value">{{ cacheAnalysis.totalResources }}</span>
                  </div>
                  <div class="cache-item">
                    <span class="cache-label">Eficiência:</span>
                    <span class="badge" [ngClass]="getEfficiencyBadgeClass(cacheAnalysis.efficiency)">
                      {{ cacheAnalysis.efficiency }}
                    </span>
                  </div>
                  <div class="cache-item">
                    <span class="cache-label">Maior Cache:</span>
                    <span class="cache-value">{{ cacheAnalysis.largestCache.name }} ({{ cacheAnalysis.largestCache.size }} recursos)</span>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="cache-types">
                  <h6>Recursos por Tipo</h6>
                  <div *ngFor="let type of getCacheTypes()" class="cache-type-item">
                    <div class="cache-type-bar">
                      <div class="cache-type-label">{{ type.name }}</div>
                      <div class="progress">
                        <div class="progress-bar" 
                             [style.width.%]="type.percentage"
                             [ngClass]="getCacheTypeClass(type.name)">
                        </div>
                      </div>
                      <div class="cache-type-value">{{ type.count }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Análise de Load Time -->
          <div *ngIf="loadTimeAnalysis" class="load-time-analysis mb-4">
            <h6>Análise de Tempo de Carregamento</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="load-time-summary">
                  <div class="load-time-category">
                    <span class="category-label">Categoria:</span>
                    <span class="badge" [ngClass]="getLoadTimeCategoryClass(loadTimeAnalysis.category)">
                      {{ loadTimeAnalysis.category }}
                    </span>
                  </div>
                  <div class="load-time-total">
                    <span class="total-label">Tempo Total:</span>
                    <span class="total-value">{{ loadTimeAnalysis.loadTime }}ms</span>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="load-time-breakdown">
                  <h6>Breakdown</h6>
                  <div class="breakdown-item" *ngFor="let item of getLoadTimeBreakdown()">
                    <span class="breakdown-label">{{ item.label }}:</span>
                    <span class="breakdown-value">{{ item.value }}ms</span>
                    <div class="breakdown-bar">
                      <div class="progress">
                        <div class="progress-bar bg-info" [style.width.%]="item.percentage"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recomendações de Performance -->
          <div *ngIf="loadTimeAnalysis?.recommendations?.length > 0" class="performance-recommendations mb-4">
            <h6>Recomendações de Performance</h6>
            <div class="alert alert-info">
              <ul class="mb-0">
                <li *ngFor="let recommendation of loadTimeAnalysis.recommendations">
                  {{ recommendation }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Status de Saúde PWA -->
          <div *ngIf="healthStatus" class="pwa-health-status mb-4">
            <h6>Status de Saúde PWA</h6>
            <div class="row">
              <div class="col-md-4">
                <div class="health-item">
                  <i class="bi" [ngClass]="healthStatus.serviceWorker ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"></i>
                  <span>Service Worker</span>
                </div>
              </div>
              <div class="col-md-4">
                <div class="health-item">
                  <i class="bi" [ngClass]="healthStatus.manifest ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"></i>
                  <span>Manifest</span>
                </div>
              </div>
              <div class="col-md-4">
                <div class="health-item">
                  <i class="bi" [ngClass]="healthStatus.offline ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"></i>
                  <span>Suporte Offline</span>
                </div>
              </div>
            </div>
            <div class="row mt-2">
              <div class="col-md-4">
                <div class="health-item">
                  <i class="bi" [ngClass]="healthStatus.installable ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"></i>
                  <span>Instalável</span>
                </div>
              </div>
              <div class="col-md-4">
                <div class="health-item">
                  <i class="bi" [ngClass]="healthStatus.https ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"></i>
                  <span>HTTPS</span>
                </div>
              </div>
              <div class="col-md-4">
                <div class="health-item">
                  <i class="bi" [ngClass]="healthStatus.responsive ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'"></i>
                  <span>Responsivo</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Histórico de Performance -->
          <div *ngIf="performanceHistory.length > 0" class="performance-history">
            <h6>Histórico de Performance (Últimas 10 medições)</h6>
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Load Time</th>
                    <th>Cache Hit</th>
                    <th>Network Requests</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let metric of performanceHistory">
                    <td>{{ formatTimestamp(metric.timestamp) }}</td>
                    <td>
                      <span [ngClass]="getLoadTimeClass(metric.loadTime)">
                        {{ metric.loadTime }}ms
                      </span>
                    </td>
                    <td>{{ (metric.cacheHitRatio * 100).toFixed(1) }}%</td>
                    <td>{{ metric.networkRequests }}</td>
                    <td>
                      <span class="badge" [ngClass]="getPerformanceStatusClass(metric)">
                        {{ getPerformanceStatus(metric) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .performance-monitor-container {
      margin: 20px 0;
    }

    .main-metrics .metric-card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      transition: all 0.3s ease;
      margin-bottom: 15px;
    }

    .main-metrics .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .main-metrics .metric-card.excellent {
      background: #d4edda;
      border-color: #c3e6cb;
    }

    .main-metrics .metric-card.good {
      background: #fff3cd;
      border-color: #ffeaa7;
    }

    .main-metrics .metric-card.poor {
      background: #f8d7da;
      border-color: #f5c6cb;
    }

    .metric-icon {
      font-size: 24px;
      color: #6c757d;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #495057;
    }

    .metric-label {
      font-size: 12px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .cache-analysis {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
    }

    .cache-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding: 5px 0;
      border-bottom: 1px solid #e9ecef;
    }

    .cache-item:last-child {
      border-bottom: none;
    }

    .cache-label {
      font-weight: 500;
      color: #495057;
    }

    .cache-value {
      color: #6c757d;
    }

    .cache-type-item {
      margin-bottom: 10px;
    }

    .cache-type-bar {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .cache-type-label {
      min-width: 80px;
      font-size: 12px;
      color: #6c757d;
    }

    .cache-type-value {
      min-width: 30px;
      text-align: right;
      font-size: 12px;
      color: #495057;
    }

    .progress {
      flex: 1;
      height: 8px;
    }

    .load-time-analysis {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
    }

    .load-time-category {
      margin-bottom: 10px;
    }

    .category-label, .total-label {
      font-weight: 500;
      color: #495057;
      margin-right: 10px;
    }

    .total-value {
      font-size: 18px;
      font-weight: bold;
      color: #495057;
    }

    .breakdown-item {
      margin-bottom: 8px;
    }

    .breakdown-label {
      display: inline-block;
      min-width: 100px;
      font-size: 12px;
      color: #6c757d;
    }

    .breakdown-value {
      font-weight: 500;
      color: #495057;
      margin-left: 10px;
    }

    .breakdown-bar {
      margin-top: 2px;
    }

    .breakdown-bar .progress {
      height: 4px;
    }

    .health-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .health-item i {
      font-size: 16px;
    }

    .health-item span {
      font-size: 14px;
      color: #495057;
    }

    .performance-history {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .btn-group .btn {
      border-radius: 4px;
    }

    .btn-group .btn:not(:last-child) {
      margin-right: 5px;
    }
  `]
})
export class PWAPerformanceMonitorComponent implements OnInit, OnDestroy {
  private performanceService = inject(PWAPerformanceService);
  private healthCheckService = inject(PWAHealthCheckService);

  currentMetrics: PerformanceMetrics | null = null;
  cacheAnalysis: CacheAnalysis | null = null;
  loadTimeAnalysis: LoadTimeAnalysis | null = null;
  healthStatus: PWAHealthStatus | null = null;
  performanceHistory: PerformanceMetrics[] = [];

  isRunningBenchmark = false;
  autoRefresh = false;
  private refreshSubscription?: Subscription;

  ngOnInit() {
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  async loadInitialData() {
    try {
      // Carrega métricas atuais
      this.currentMetrics = await this.performanceService.getCurrentMetrics();
      
      // Carrega análise de cache
      this.cacheAnalysis = await this.performanceService.analyzeCachePerformance();
      
      // Carrega análise de load time
      if (this.currentMetrics) {
        this.loadTimeAnalysis = await this.performanceService.analyzeLoadTime(this.currentMetrics.loadTime);
      }
      
      // Carrega status de saúde
      this.healthStatus = await this.healthCheckService.checkPWAHealth();
      
      // Carrega histórico
      this.performanceHistory = await this.performanceService.getPerformanceHistory();
      
    } catch (error) {
      console.error('Erro ao carregar dados de performance:', error);
    }
  }

  async runBenchmark() {
    if (this.isRunningBenchmark) return;

    this.isRunningBenchmark = true;
    
    try {
      // Executa benchmark completo
      const benchmarkResults = await this.performanceService.runPerformanceBenchmark();
      
      // Atualiza métricas
      this.currentMetrics = benchmarkResults.metrics;
      this.cacheAnalysis = benchmarkResults.cacheAnalysis;
      this.loadTimeAnalysis = benchmarkResults.loadTimeAnalysis;
      
      // Atualiza histórico
      this.performanceHistory = await this.performanceService.getPerformanceHistory();
      
    } catch (error) {
      console.error('Erro durante benchmark:', error);
    } finally {
      this.isRunningBenchmark = false;
    }
  }

  toggleAutoRefresh() {
    if (this.autoRefresh) {
      this.stopAutoRefresh();
    } else {
      this.startAutoRefresh();
    }
  }

  private startAutoRefresh() {
    this.autoRefresh = true;
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadInitialData();
    });
  }

  private stopAutoRefresh() {
    this.autoRefresh = false;
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  getLoadTimeClass(loadTime: number): string {
    if (loadTime < 1000) return 'excellent';
    if (loadTime < 3000) return 'good';
    return 'poor';
  }

  getCacheHitClass(ratio: number): string {
    if (ratio > 0.8) return 'excellent';
    if (ratio > 0.6) return 'good';
    return 'poor';
  }

  getEfficiencyBadgeClass(efficiency: string): string {
    switch (efficiency.toLowerCase()) {
      case 'excelente': return 'bg-success';
      case 'boa': return 'bg-primary';
      case 'regular': return 'bg-warning';
      default: return 'bg-danger';
    }
  }

  getCacheTypes() {
    if (!this.cacheAnalysis) return [];
    
    const total = this.cacheAnalysis.totalResources;
    return this.cacheAnalysis.resourceTypes.map(type => ({
      ...type,
      percentage: (type.count / total) * 100
    }));
  }

  getCacheTypeClass(typeName: string): string {
    const typeClasses: { [key: string]: string } = {
      'html': 'bg-primary',
      'css': 'bg-success',
      'js': 'bg-warning',
      'images': 'bg-info',
      'fonts': 'bg-secondary',
      'api': 'bg-danger'
    };
    return typeClasses[typeName.toLowerCase()] || 'bg-light';
  }

  getLoadTimeCategoryClass(category: string): string {
    switch (category.toLowerCase()) {
      case 'excelente': return 'bg-success';
      case 'boa': return 'bg-primary';
      case 'regular': return 'bg-warning';
      default: return 'bg-danger';
    }
  }

  getLoadTimeBreakdown() {
    if (!this.loadTimeAnalysis) return [];
    
    const breakdown = this.loadTimeAnalysis.breakdown;
    const total = this.loadTimeAnalysis.loadTime;
    
    return Object.entries(breakdown).map(([key, value]) => ({
      label: this.getBreakdownLabel(key),
      value,
      percentage: (value / total) * 100
    }));
  }

  private getBreakdownLabel(key: string): string {
    const labels: { [key: string]: string } = {
      'dns': 'DNS Lookup',
      'connection': 'Conexão',
      'request': 'Request',
      'response': 'Response',
      'processing': 'Processamento',
      'rendering': 'Renderização'
    };
    return labels[key] || key;
  }

  getPerformanceStatus(metric: PerformanceMetrics): string {
    if (metric.loadTime < 1000 && metric.cacheHitRatio > 0.8) return 'Excelente';
    if (metric.loadTime < 3000 && metric.cacheHitRatio > 0.6) return 'Boa';
    if (metric.loadTime < 5000) return 'Regular';
    return 'Ruim';
  }

  getPerformanceStatusClass(metric: PerformanceMetrics): string {
    const status = this.getPerformanceStatus(metric);
    switch (status) {
      case 'Excelente': return 'bg-success';
      case 'Boa': return 'bg-primary';
      case 'Regular': return 'bg-warning';
      default: return 'bg-danger';
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('pt-BR');
  }
}