import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService, LogLevel, LogConfig } from '../../../services/logger.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-log-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="log-control-container" *ngIf="showControls">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="bi bi-terminal"></i>
            Controle de Logs
          </h6>
          <button 
            class="btn btn-sm btn-outline-secondary"
            (click)="toggleExpanded()">
            <i class="bi" [ngClass]="expanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
          </button>
        </div>

        <div class="card-body" [class.collapsed]="!expanded">
          <!-- Nível de Log -->
          <div class="mb-3">
            <label class="form-label">Nível de Log</label>
            <select 
              class="form-select form-select-sm" 
              [(ngModel)]="currentConfig.level"
              (change)="updateLogLevel()">
              <option [value]="LogLevel.ERROR">Error (0) - Apenas erros</option>
              <option [value]="LogLevel.WARN">Warning (1) - Erros e avisos</option>
              <option [value]="LogLevel.INFO">Info (2) - Informações importantes</option>
              <option [value]="LogLevel.DEBUG">Debug (3) - Logs de desenvolvimento</option>
              <option [value]="LogLevel.VERBOSE">Verbose (4) - Todos os logs</option>
            </select>
          </div>

          <!-- Controles de Console -->
          <div class="mb-3">
            <div class="form-check form-switch">
              <input 
                class="form-check-input" 
                type="checkbox" 
                id="enableConsole"
                [(ngModel)]="currentConfig.enableConsole"
                (change)="updateConfig()">
              <label class="form-check-label" for="enableConsole">
                Exibir logs no console
              </label>
            </div>
          </div>

          <!-- Categorias -->
          <div class="mb-3">
            <label class="form-label">Categorias de Log</label>
            <div class="category-controls">
              <div class="category-item" *ngFor="let category of availableCategories">
                <div class="form-check form-switch">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    [id]="'cat-' + category"
                    [checked]="isCategoryEnabled(category)"
                    (change)="toggleCategory(category, $event)">
                  <label class="form-check-label" [for]="'cat-' + category">
                    {{ getCategoryDisplayName(category) }}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Ações -->
          <div class="d-flex gap-2">
            <button 
              class="btn btn-sm btn-primary"
              (click)="applyPreset('production')">
              <i class="bi bi-shield-check"></i>
              Produção
            </button>
            <button 
              class="btn btn-sm btn-info"
              (click)="applyPreset('development')">
              <i class="bi bi-code-slash"></i>
              Desenvolvimento
            </button>
            <button 
              class="btn btn-sm btn-warning"
              (click)="applyPreset('debug')">
              <i class="bi bi-bug"></i>
              Debug
            </button>
            <button 
              class="btn btn-sm btn-secondary"
              (click)="clearLogs()">
              <i class="bi bi-trash"></i>
              Limpar
            </button>
          </div>

          <!-- Estatísticas -->
          <div class="mt-3 pt-3 border-top">
            <small class="text-muted">
              <div>Logs armazenados: {{ storedLogsCount }}</div>
              <div>Ambiente: {{ environment.production ? 'Produção' : 'Desenvolvimento' }}</div>
            </small>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .log-control-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      z-index: 1050;
      opacity: 0.9;
    }

    .log-control-container:hover {
      opacity: 1;
    }

    .card {
      border: 1px solid #dee2e6;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
      padding: 8px 12px;
    }

    .card-body {
      padding: 12px;
      max-height: 400px;
      overflow-y: auto;
      transition: all 0.3s ease;
    }

    .card-body.collapsed {
      display: none;
    }

    .category-controls {
      max-height: 150px;
      overflow-y: auto;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 8px;
    }

    .category-item {
      margin-bottom: 4px;
    }

    .form-check-input {
      margin-top: 0.1rem;
    }

    .form-check-label {
      font-size: 0.875rem;
    }

    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    @media (max-width: 768px) {
      .log-control-container {
        width: 280px;
        bottom: 10px;
        right: 10px;
      }
    }
  `]
})
export class LogControlComponent implements OnInit {
  LogLevel = LogLevel;
  environment = environment;
  
  showControls = !environment.production; // Só mostrar em desenvolvimento por padrão
  expanded = false;
  currentConfig!: LogConfig;
  storedLogsCount = 0;

  availableCategories = [
    'HOME',
    'SERVICE', 
    'PARCELA-SERVICE',
    'PWA-ERROR',
    'PWA-RECOVERY',
    'PWA-CACHE',
    'PWA-PERFORMANCE',
    'PWA-HEALTH',
    'AUTH',
    'CRITICAL'
  ];

  constructor(private logger: LoggerService) {}

  ngOnInit() {
    this.currentConfig = { ...this.logger.getConfig() };
    this.updateStoredLogsCount();
    
    // Atualizar contagem a cada 5 segundos
    setInterval(() => {
      this.updateStoredLogsCount();
    }, 5000);

    // Mostrar controles se estiver em modo debug
    if (localStorage.getItem('debug_mode') === 'true') {
      this.showControls = true;
    }
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
  }

  updateLogLevel() {
    this.logger.setLogLevel(this.currentConfig.level);
  }

  updateConfig() {
    this.logger.updateConfig(this.currentConfig);
  }

  isCategoryEnabled(category: string): boolean {
    return !this.currentConfig.disabledCategories.includes(category) &&
           (this.currentConfig.enabledCategories.includes('*') || 
            this.currentConfig.enabledCategories.includes(category));
  }

  toggleCategory(category: string, event: any) {
    if (event.target.checked) {
      this.logger.enableCategory(category);
    } else {
      this.logger.disableCategory(category);
    }
    this.currentConfig = { ...this.logger.getConfig() };
  }

  getCategoryDisplayName(category: string): string {
    const displayNames: { [key: string]: string } = {
      'HOME': 'Home (Dashboard)',
      'SERVICE': 'Serviços',
      'PARCELA-SERVICE': 'Parcelas',
      'PWA-ERROR': 'Erros PWA',
      'PWA-RECOVERY': 'Recuperação PWA',
      'PWA-CACHE': 'Cache PWA',
      'PWA-PERFORMANCE': 'Performance PWA',
      'PWA-HEALTH': 'Saúde PWA',
      'AUTH': 'Autenticação',
      'CRITICAL': 'Críticos'
    };
    return displayNames[category] || category;
  }

  applyPreset(preset: string) {
    switch (preset) {
      case 'production':
        this.logger.updateConfig({
          level: LogLevel.WARN,
          enabledCategories: ['PWA-ERROR', 'AUTH', 'CRITICAL'],
          disabledCategories: ['HOME', 'SERVICE', 'PARCELA-SERVICE', 'PWA-RECOVERY', 'PWA-CACHE', 'PWA-PERFORMANCE', 'PWA-HEALTH'],
          enableConsole: false
        });
        break;
        
      case 'development':
        this.logger.updateConfig({
          level: LogLevel.DEBUG,
          enabledCategories: ['*'],
          disabledCategories: ['HOME', 'PWA-PERFORMANCE'],
          enableConsole: true
        });
        break;
        
      case 'debug':
        this.logger.updateConfig({
          level: LogLevel.VERBOSE,
          enabledCategories: ['*'],
          disabledCategories: [],
          enableConsole: true
        });
        break;
    }
    
    this.currentConfig = { ...this.logger.getConfig() };
  }

  clearLogs() {
    this.logger.clearLogs();
    this.updateStoredLogsCount();
  }

  private updateStoredLogsCount() {
    this.storedLogsCount = this.logger.getLogs().length;
  }

  // Método para mostrar/ocultar controles (pode ser chamado via console)
  toggleControls() {
    this.showControls = !this.showControls;
    if (this.showControls) {
      localStorage.setItem('debug_mode', 'true');
    } else {
      localStorage.removeItem('debug_mode');
    }
  }
}