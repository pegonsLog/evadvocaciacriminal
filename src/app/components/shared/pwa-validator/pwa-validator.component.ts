import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PWAValidationService, PWAValidationSummary, PWAValidationResult } from '../../../services/pwa-validation.service';
import { PWAPerformanceService, PerformanceMetrics, CacheAnalysis } from '../../../services/pwa-performance.service';
import { PWAUpdateService } from '../../../services/pwa-update.service';
import { PWAHealthCheckService, PWAHealthStatus } from '../../../services/pwa-health-check.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pwa-validator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pwa-validator-container">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">
            <i class="bi bi-shield-check"></i>
            Validação PWA
          </h5>
          <div class="btn-group">
            <button 
              class="btn btn-primary btn-sm" 
              (click)="runValidation()"
              [disabled]="isValidating">
              <i class="bi bi-arrow-clockwise" [class.spin]="isValidating"></i>
              {{ isValidating ? 'Validando...' : 'Validar PWA' }}
            </button>
            <button 
              class="btn btn-outline-secondary btn-sm" 
              (click)="runPerformanceTest()"
              [disabled]="isTestingPerformance">
              <i class="bi bi-speedometer2" [class.spin]="isTestingPerformance"></i>
              {{ isTestingPerformance ? 'Testando...' : 'Testar Performance' }}
            </button>
          </div>
        </div>

        <div class="card-body">
          <!-- Resumo da Validação -->
          <div *ngIf="validationSummary" class="validation-summary mb-4">
            <div class="row">
              <div class="col-md-3">
                <div class="metric-card" [ngClass]="getScoreClass(validationSummary.score)">
                  <div class="metric-value">{{ validationSummary.score }}/100</div>
                  <div class="metric-label">Score PWA</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="metric-card">
                  <div class="metric-value text-success">{{ validationSummary.passed }}</div>
                  <div class="metric-label">Passou</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="metric-card">
                  <div class="metric-value text-warning">{{ validationSummary.warnings }}</div>
                  <div class="metric-label">Avisos</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="metric-card">
                  <div class="metric-value text-danger">{{ validationSummary.failed }}</div>
                  <div class="metric-label">Falhou</div>
                </div>
              </div>
            </div>

            <div class="row mt-3">
              <div class="col-md-6">
                <div class="status-indicator">
                  <i class="bi" [ngClass]="validationSummary.isInstallable ? 'bi-check-circle text-success' : 'bi-x-circle text-danger'"></i>
                  <span [ngClass]="validationSummary.isInstallable ? 'text-success' : 'text-danger'">
                    {{ validationSummary.isInstallable ? 'Instalável' : 'Não Instalável' }}
                  </span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="status-indicator">
                  <i class="bi" [ngClass]="validationSummary.isPWACompliant ? 'bi-award text-success' : 'bi-exclamation-triangle text-warning'"></i>
                  <span [ngClass]="validationSummary.isPWACompliant ? 'text-success' : 'text-warning'">
                    {{ validationSummary.isPWACompliant ? 'PWA Compliant' : 'Não Compliant' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Status de Saúde -->
          <div *ngIf="healthStatus" class="health-status mb-4">
            <h6>Status de Saúde do PWA</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="health-item">
                  <span class="health-label">Geral:</span>
                  <span class="badge" [ngClass]="getHealthBadgeClass(healthStatus.overall)">
                    {{ healthStatus.overall }}
                  </span>
                </div>
                <div class="health-item">
                  <span class="health-label">Service Worker:</span>
                  <span class="badge" [ngClass]="getHealthBadgeClass(healthStatus.serviceWorker)">
                    {{ healthStatus.serviceWorker }}
                  </span>
                </div>
                <div class="health-item">
                  <span class="health-label">Cache:</span>
                  <span class="badge" [ngClass]="getHealthBadgeClass(healthStatus.cache)">
                    {{ healthStatus.cache }}
                  </span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="health-item">
                  <span class="health-label">Updates:</span>
                  <span class="badge" [ngClass]="getHealthBadgeClass(healthStatus.updates)">
                    {{ healthStatus.updates }}
                  </span>
                </div>
                <div class="health-item">
                  <span class="health-label">Offline:</span>
                  <span class="badge" [ngClass]="getHealthBadgeClass(healthStatus.offline)">
                    {{ healthStatus.offline }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Métricas de Performance -->
          <div *ngIf="performanceMetrics" class="performance-metrics mb-4">
            <h6>Métricas de Performance</h6>
            <div class="row">
              <div class="col-md-4">
                <div class="metric-item">
                  <span class="metric-label">Load Time:</span>
                  <span class="metric-value" [ngClass]="getLoadTimeClass(performanceMetrics.loadTime)">
                    {{ performanceMetrics.loadTime }}ms
                  </span>
                </div>
              </div>
              <div class="col-md-4">
                <div class="metric-item">
                  <span class="metric-label">Cache Hit Ratio:</span>
                  <span class="metric-value text-info">
                    {{ (performanceMetrics.cacheHitRatio * 100).toFixed(1) }}%
                  </span>
                </div>
              </div>
              <div class="col-md-4">
                <div class="metric-item">
                  <span class="metric-label">Cached Resources:</span>
                  <span class="metric-value text-info">
                    {{ performanceMetrics.totalCachedResources }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Resultados Detalhados -->
          <div *ngIf="validationSummary" class="validation-results">
            <h6>Resultados Detalhados</h6>
            
            <!-- Filtros -->
            <div class="mb-3">
              <div class="btn-group btn-group-sm" role="group">
                <input type="radio" class="btn-check" name="filter" id="all" value="all" 
                       [(ngModel)]="selectedFilter" (change)="applyFilter()">
                <label class="btn btn-outline-secondary" for="all">Todos</label>

                <input type="radio" class="btn-check" name="filter" id="pass" value="pass"
                       [(ngModel)]="selectedFilter" (change)="applyFilter()">
                <label class="btn btn-outline-success" for="pass">Passou</label>

                <input type="radio" class="btn-check" name="filter" id="fail" value="fail"
                       [(ngModel)]="selectedFilter" (change)="applyFilter()">
                <label class="btn btn-outline-danger" for="fail">Falhou</label>

                <input type="radio" class="btn-check" name="filter" id="warning" value="warning"
                       [(ngModel)]="selectedFilter" (change)="applyFilter()">
                <label class="btn btn-outline-warning" for="warning">Avisos</label>
              </div>
            </div>

            <!-- Lista de Resultados -->
            <div class="results-list">
              <div *ngFor="let result of filteredResults" 
                   class="result-item" 
                   [ngClass]="'result-' + result.status">
                <div class="result-header">
                  <span class="result-icon">
                    <i class="bi" [ngClass]="getResultIcon(result.status)"></i>
                  </span>
                  <span class="result-category badge">{{ result.category }}</span>
                  <span class="result-test">{{ result.test }}</span>
                  <span class="result-status badge" [ngClass]="getStatusBadgeClass(result.status)">
                    {{ result.status }}
                  </span>
                </div>
                <div class="result-message">{{ result.message }}</div>
                <div *ngIf="result.details" class="result-details">
                  <small class="text-muted">
                    <pre>{{ result.details | json }}</pre>
                  </small>
                </div>
              </div>
            </div>
          </div>

          <!-- Recomendações -->
          <div *ngIf="recommendations.length > 0" class="recommendations mt-4">
            <h6>Recomendações</h6>
            <ul class="list-group list-group-flush">
              <li *ngFor="let recommendation of recommendations" class="list-group-item">
                <i class="bi bi-lightbulb text-warning me-2"></i>
                {{ recommendation }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pwa-validator-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .metric-card {
      text-align: center;
      padding: 1rem;
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      background: #f8f9fa;
    }

    .metric-card.excellent { border-color: #198754; background: #d1e7dd; }
    .metric-card.good { border-color: #0d6efd; background: #cff4fc; }
    .metric-card.warning { border-color: #fd7e14; background: #fff3cd; }
    .metric-card.poor { border-color: #dc3545; background: #f8d7da; }

    .metric-value {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.25rem;
    }

    .metric-label {
      font-size: 0.875rem;
      color: #6c757d;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .health-item, .metric-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
      border-bottom: 1px solid #eee;
    }

    .health-item:last-child, .metric-item:last-child {
      border-bottom: none;
    }

    .health-label, .metric-label {
      font-weight: 500;
    }

    .result-item {
      border: 1px solid #dee2e6;
      border-radius: 0.375rem;
      padding: 1rem;
      margin-bottom: 0.5rem;
    }

    .result-item.result-pass { border-left: 4px solid #198754; }
    .result-item.result-fail { border-left: 4px solid #dc3545; }
    .result-item.result-warning { border-left: 4px solid #fd7e14; }
    .result-item.result-info { border-left: 4px solid #0dcaf0; }

    .result-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .result-test {
      flex: 1;
      font-weight: 500;
    }

    .result-message {
      color: #495057;
      margin-bottom: 0.5rem;
    }

    .result-details pre {
      font-size: 0.75rem;
      max-height: 100px;
      overflow-y: auto;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .btn-group .btn-check:checked + .btn {
      background-color: var(--bs-primary);
      border-color: var(--bs-primary);
      color: white;
    }
  `]
})
export class PWAValidatorComponent implements OnInit, OnDestroy {
  private validationService = inject(PWAValidationService);
  private performanceService = inject(PWAPerformanceService);
  private updateService = inject(PWAUpdateService);
  private healthService = inject(PWAHealthCheckService);

  validationSummary: PWAValidationSummary | null = null;
  performanceMetrics: PerformanceMetrics | null = null;
  healthStatus: PWAHealthStatus | null = null;
  recommendations: string[] = [];

  filteredResults: PWAValidationResult[] = [];
  selectedFilter: 'all' | 'pass' | 'fail' | 'warning' = 'all';

  isValidating = false;
  isTestingPerformance = false;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Subscreve aos observables dos serviços
    this.subscriptions.push(
      this.validationService.validation$.subscribe(validation => {
        this.validationSummary = validation;
        if (validation) {
          this.applyFilter();
          this.updateRecommendations();
        }
      }),

      this.performanceService.metrics$.subscribe(metrics => {
        this.performanceMetrics = metrics;
      }),

      this.healthService.healthStatus$.subscribe(health => {
        this.healthStatus = health;
      })
    );

    // Executa verificação inicial de saúde
    this.healthService.forceHealthCheck();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.performanceService.destroy();
  }

  /**
   * Executa validação completa do PWA
   */
  async runValidation(): Promise<void> {
    this.isValidating = true;
    
    try {
      console.log('🔍 [PWA-VALIDATOR] Iniciando validação...');
      await this.validationService.validatePWA();
      
      // Também executa verificação de saúde
      await this.healthService.forceHealthCheck();
      
      console.log('✅ [PWA-VALIDATOR] Validação concluída');
    } catch (error) {
      console.error('❌ [PWA-VALIDATOR] Erro durante validação:', error);
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * Executa teste de performance
   */
  async runPerformanceTest(): Promise<void> {
    this.isTestingPerformance = true;
    
    try {
      console.log('📊 [PWA-VALIDATOR] Iniciando teste de performance...');
      await this.performanceService.runPerformanceBenchmark();
      console.log('✅ [PWA-VALIDATOR] Teste de performance concluído');
    } catch (error) {
      console.error('❌ [PWA-VALIDATOR] Erro durante teste de performance:', error);
    } finally {
      this.isTestingPerformance = false;
    }
  }

  /**
   * Aplica filtro aos resultados
   */
  applyFilter(): void {
    if (!this.validationSummary) {
      this.filteredResults = [];
      return;
    }

    if (this.selectedFilter === 'all') {
      this.filteredResults = this.validationSummary.results;
    } else {
      this.filteredResults = this.validationSummary.results.filter(
        result => result.status === this.selectedFilter
      );
    }
  }

  /**
   * Atualiza recomendações
   */
  private updateRecommendations(): void {
    const validationRecs = this.validationService.getRecommendations();
    const healthRecs = this.healthService.getHealthRecommendations();
    
    this.recommendations = [...validationRecs, ...healthRecs];
  }

  /**
   * Obtém classe CSS para o score
   */
  getScoreClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'poor';
  }

  /**
   * Obtém classe CSS para status de saúde
   */
  getHealthBadgeClass(status: string): string {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'working':
      case 'supported':
        return 'badge-success';
      case 'degraded':
      case 'inactive':
      case 'limited':
      case 'disabled':
        return 'badge-warning';
      case 'unhealthy':
      case 'error':
      case 'failed':
      case 'unsupported':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  /**
   * Obtém classe CSS para tempo de carregamento
   */
  getLoadTimeClass(loadTime: number): string {
    if (loadTime < 1000) return 'text-success';
    if (loadTime < 2500) return 'text-info';
    if (loadTime < 4000) return 'text-warning';
    return 'text-danger';
  }

  /**
   * Obtém ícone para status do resultado
   */
  getResultIcon(status: string): string {
    switch (status) {
      case 'pass': return 'bi-check-circle text-success';
      case 'fail': return 'bi-x-circle text-danger';
      case 'warning': return 'bi-exclamation-triangle text-warning';
      case 'info': return 'bi-info-circle text-info';
      default: return 'bi-question-circle text-secondary';
    }
  }

  /**
   * Obtém classe CSS para badge de status
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pass': return 'bg-success';
      case 'fail': return 'bg-danger';
      case 'warning': return 'bg-warning';
      case 'info': return 'bg-info';
      default: return 'bg-secondary';
    }
  }
}