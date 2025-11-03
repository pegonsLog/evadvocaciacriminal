import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

export interface DadosInadimplencia {
  mes: string;
  ano: number;
  taxa: number;
  totalParcelas: number;
  parcelasAtrasadas: number;
  criticidade: 'baixa' | 'media' | 'alta';
}

@Component({
  selector: 'app-grafico-inadimplencia',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card h-100">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Taxa de Inadimplência
        </h5>
        <div class="btn-group btn-group-sm" role="group">
          <button
            type="button"
            class="btn btn-outline-secondary"
            [class.active]="periodoSelecionado === '6m'"
            (click)="alterarPeriodo('6m')">
            6M
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            [class.active]="periodoSelecionado === '12m'"
            (click)="alterarPeriodo('12m')">
            12M
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            [class.active]="periodoSelecionado === 'todos'"
            (click)="alterarPeriodo('todos')">
            Todos
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="chart-container" style="position: relative; height: 300px;">
          <canvas #chartCanvas></canvas>
        </div>
        <div class="mt-3" *ngIf="dadosInadimplencia && dadosInadimplencia.length > 0">
          <div class="row">
            <div class="col-3 text-center">
              <small class="text-muted">Taxa Atual</small>
              <div class="fw-bold fs-5" [ngClass]="obterClasseTaxa(taxaAtual)">
                {{ taxaAtual.toFixed(1) }}%
              </div>
            </div>
            <div class="col-3 text-center">
              <small class="text-muted">Taxa Média</small>
              <div class="fw-bold fs-5">{{ taxaMedia.toFixed(1) }}%</div>
            </div>
            <div class="col-3 text-center">
              <small class="text-muted">Pior Período</small>
              <div class="fw-bold fs-5 text-danger">{{ piorTaxa.toFixed(1) }}%</div>
            </div>
            <div class="col-3 text-center">
              <small class="text-muted">Tendência</small>
              <div class="fw-bold fs-5" [ngClass]="obterClasseTendencia()">
                <i [class]="obterIconeTendencia()"></i>
                {{ obterValorAbsolutoTendencia() }}%
              </div>
            </div>
          </div>
          <div class="mt-3 pt-3 border-top" *ngIf="periodosComAlerta.length > 0">
            <h6 class="text-warning">
              <i class="fas fa-exclamation-triangle me-1"></i>
              Períodos Críticos
            </h6>
            <div class="d-flex flex-wrap gap-2">
              <span
                *ngFor="let periodo of periodosComAlerta"
                class="badge"
                [ngClass]="obterClasseAlerta(periodo.criticidade)">
                {{ periodo.mes }}/{{ periodo.ano }} ({{ periodo.taxa.toFixed(1) }}%)
              </span>
            </div>
          </div>
        </div>
        <div class="text-center py-4" *ngIf="!dadosInadimplencia || dadosInadimplencia.length === 0">
          <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
          <p class="text-muted">Nenhum dado disponível</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
      height: 300px;
    }

    .btn-group .btn.active {
      background-color: var(--bs-secondary);
      border-color: var(--bs-secondary);
      color: white;
    }

    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .text-success {
      color: #28a745 !important;
    }

    .text-warning {
      color: #ffc107 !important;
    }

    .text-danger {
      color: #dc3545 !important;
    }

    .border-top {
      border-top: 1px solid #dee2e6 !important;
    }

    .badge {
      font-size: 0.75rem;
    }

    .bg-warning {
      background-color: #ffc107 !important;
      color: #000 !important;
    }

    .bg-danger {
      background-color: #dc3545 !important;
    }

    .gap-2 {
      gap: 0.5rem;
    }
  `]
})
export class GraficoInadimplenciaComponent implements OnInit, OnDestroy, OnChanges {
  @Input() dadosInadimplencia: DadosInadimplencia[] = [];
  @Input() carregando: boolean = false;
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  periodoSelecionado: string = '12m';

  // Métricas calculadas
  taxaAtual: number = 0;
  taxaMedia: number = 0;
  piorTaxa: number = 0;
  tendencia: number = 0;
  periodosComAlerta: DadosInadimplencia[] = [];

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.criarGrafico();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dadosInadimplencia'] && !changes['dadosInadimplencia'].firstChange) {
      this.atualizarGrafico();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  alterarPeriodo(periodo: string): void {
    this.periodoSelecionado = periodo;
    this.atualizarGrafico();
  }

  obterClasseTaxa(taxa: number): string {
    if (taxa <= 5) return 'text-success';
    if (taxa <= 15) return 'text-warning';
    return 'text-danger';
  }

  obterClasseTendencia(): string {
    if (this.tendencia > 0) return 'text-danger';
    if (this.tendencia < 0) return 'text-success';
    return 'text-muted';
  }

  obterIconeTendencia(): string {
    if (this.tendencia > 0) return 'fas fa-arrow-up';
    if (this.tendencia < 0) return 'fas fa-arrow-down';
    return 'fas fa-minus';
  }

  obterClasseAlerta(criticidade: string): string {
    switch (criticidade) {
      case 'alta': return 'bg-danger';
      case 'media': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  obterValorAbsolutoTendencia(): string {
    return Math.abs(this.tendencia).toFixed(1);
  }

  private criarGrafico(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: this.prepararDados(),
      options: this.obterOpcoes()
    };

    this.chart = new Chart(ctx, config);
    this.calcularMetricas();
  }

  private atualizarGrafico(): void {
    if (!this.chart) {
      this.criarGrafico();
      return;
    }

    this.chart.data = this.prepararDados();
    this.chart.update('active');
    this.calcularMetricas();
  }

  private obterDadosFiltrados(): DadosInadimplencia[] {
    if (this.periodoSelecionado === 'todos') {
      return this.dadosInadimplencia;
    }

    const mesesParaMostrar = this.periodoSelecionado === '6m' ? 6 : 12;
    return this.dadosInadimplencia.slice(-mesesParaMostrar);
  }

  private prepararDados() {
    const dadosFiltrados = this.obterDadosFiltrados();
    const labels = dadosFiltrados.map(item => `${item.mes}/${item.ano}`);
    const taxas = dadosFiltrados.map(item => item.taxa);

    // Criar pontos de alerta para períodos críticos
    const pontosAlerta = dadosFiltrados.map(item =>
      item.criticidade === 'alta' ? item.taxa : null
    );

    return {
      labels,
      datasets: [
        {
          label: 'Taxa de Inadimplência (%)',
          data: taxas,
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: dadosFiltrados.map(item => {
            switch (item.criticidade) {
              case 'alta': return '#dc3545';
              case 'media': return '#ffc107';
              default: return '#28a745';
            }
          }),
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Períodos Críticos',
          data: pontosAlerta,
          borderColor: 'transparent',
          backgroundColor: '#dc3545',
          pointBackgroundColor: '#dc3545',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 3,
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false
        }
      ]
    };
  }

  private obterOpcoes(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            filter: (legendItem) => legendItem.text !== 'Períodos Críticos'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: '#dee2e6',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const dataIndex = context.dataIndex;
              const dadosFiltrados = this.obterDadosFiltrados();
              const item = dadosFiltrados[dataIndex];

              if (context.datasetIndex === 0) {
                return [
                  `Taxa: ${item.taxa.toFixed(1)}%`,
                  `Parcelas atrasadas: ${item.parcelasAtrasadas}`,
                  `Total de parcelas: ${item.totalParcelas}`,
                  `Criticidade: ${item.criticidade.toUpperCase()}`
                ];
              }
              return `Período crítico: ${item.taxa.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            maxRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: (value) => `${value}%`
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    };
  }

  private calcularMetricas(): void {
    const dadosFiltrados = this.obterDadosFiltrados();

    if (dadosFiltrados.length === 0) {
      this.taxaAtual = 0;
      this.taxaMedia = 0;
      this.piorTaxa = 0;
      this.tendencia = 0;
      this.periodosComAlerta = [];
      return;
    }

    // Taxa atual (último período)
    this.taxaAtual = dadosFiltrados[dadosFiltrados.length - 1].taxa;

    // Taxa média
    this.taxaMedia = dadosFiltrados.reduce((sum, item) => sum + item.taxa, 0) / dadosFiltrados.length;

    // Pior taxa
    this.piorTaxa = Math.max(...dadosFiltrados.map(item => item.taxa));

    // Tendência (comparação entre últimos 3 meses vs 3 anteriores)
    if (dadosFiltrados.length >= 6) {
      const ultimosTres = dadosFiltrados.slice(-3);
      const anterioresTres = dadosFiltrados.slice(-6, -3);

      const mediaUltimos = ultimosTres.reduce((sum, item) => sum + item.taxa, 0) / 3;
      const mediaAnteriores = anterioresTres.reduce((sum, item) => sum + item.taxa, 0) / 3;

      this.tendencia = mediaUltimos - mediaAnteriores;
    } else {
      this.tendencia = 0;
    }

    // Períodos com alerta (criticidade média ou alta)
    this.periodosComAlerta = dadosFiltrados.filter(item =>
      item.criticidade === 'media' || item.criticidade === 'alta'
    );
  }
}
