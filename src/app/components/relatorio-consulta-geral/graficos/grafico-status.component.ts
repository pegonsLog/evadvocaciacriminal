import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

export interface DistribuicaoStatus {
  pagos: number;
  pendentes: number;
  atrasados: number;
}

@Component({
  selector: 'app-grafico-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card h-100">
      <div class="card-header">
        <h5 class="card-title mb-0">
          <i class="fas fa-chart-pie me-2"></i>
          Status dos Pagamentos
        </h5>
      </div>
      <div class="card-body">
        <div class="chart-container" style="position: relative; height: 300px;">
          <canvas #chartCanvas></canvas>
        </div>
        <div class="mt-3" *ngIf="distribuicaoStatus">
          <div class="row">
            <div class="col-12">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <div class="d-flex align-items-center">
                  <div class="status-indicator bg-success me-2"></div>
                  <span class="text-muted">Pagos</span>
                </div>
                <div class="fw-bold">
                  {{ distribuicaoStatus.pagos }} ({{ calcularPercentual(distribuicaoStatus.pagos) }}%)
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <div class="d-flex align-items-center">
                  <div class="status-indicator bg-warning me-2"></div>
                  <span class="text-muted">Pendentes</span>
                </div>
                <div class="fw-bold">
                  {{ distribuicaoStatus.pendentes }} ({{ calcularPercentual(distribuicaoStatus.pendentes) }}%)
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                  <div class="status-indicator bg-danger me-2"></div>
                  <span class="text-muted">Atrasados</span>
                </div>
                <div class="fw-bold">
                  {{ distribuicaoStatus.atrasados }} ({{ calcularPercentual(distribuicaoStatus.atrasados) }}%)
                </div>
              </div>
            </div>
          </div>
          <div class="row mt-3 pt-3 border-top">
            <div class="col-6 text-center">
              <small class="text-muted">Total de Parcelas</small>
              <div class="fw-bold fs-5">{{ obterTotal() }}</div>
            </div>
            <div class="col-6 text-center">
              <small class="text-muted">Taxa de Adimplência</small>
              <div class="fw-bold fs-5 text-success">{{ calcularTaxaAdimplencia() }}%</div>
            </div>
          </div>
        </div>
        <div class="text-center py-4" *ngIf="!distribuicaoStatus || obterTotal() === 0">
          <i class="fas fa-chart-pie fa-3x text-muted mb-3"></i>
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

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }

    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .bg-success {
      background-color: #28a745 !important;
    }

    .bg-warning {
      background-color: #ffc107 !important;
    }

    .bg-danger {
      background-color: #dc3545 !important;
    }

    .text-success {
      color: #28a745 !important;
    }

    .border-top {
      border-top: 1px solid #dee2e6 !important;
    }
  `]
})
export class GraficoStatusComponent implements OnInit, OnDestroy, OnChanges {
  @Input() distribuicaoStatus: DistribuicaoStatus | null = null;
  @Input() carregando: boolean = false;
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.criarGrafico();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['distribuicaoStatus'] && !changes['distribuicaoStatus'].firstChange) {
      this.atualizarGrafico();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  calcularPercentual(valor: number): number {
    const total = this.obterTotal();
    return total > 0 ? Math.round((valor / total) * 100) : 0;
  }

  obterTotal(): number {
    if (!this.distribuicaoStatus) return 0;
    return this.distribuicaoStatus.pagos + this.distribuicaoStatus.pendentes + this.distribuicaoStatus.atrasados;
  }

  calcularTaxaAdimplencia(): number {
    if (!this.distribuicaoStatus) return 0;
    const total = this.obterTotal();
    return total > 0 ? Math.round((this.distribuicaoStatus.pagos / total) * 100) : 0;
  }

  private criarGrafico(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: any = {
      type: 'doughnut',
      data: this.prepararDados(),
      options: {
        ...this.obterOpcoes(),
        cutout: '60%' // Para criar o efeito doughnut
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private atualizarGrafico(): void {
    if (!this.chart) {
      this.criarGrafico();
      return;
    }

    this.chart.data = this.prepararDados();
    this.chart.update('active');
  }

  private prepararDados() {
    if (!this.distribuicaoStatus) {
      return {
        labels: [],
        datasets: []
      };
    }

    const dados = [
      this.distribuicaoStatus.pagos,
      this.distribuicaoStatus.pendentes,
      this.distribuicaoStatus.atrasados
    ];

    const labels = ['Pagos', 'Pendentes', 'Atrasados'];
    const cores = ['#28a745', '#ffc107', '#dc3545'];
    const coresHover = ['#218838', '#e0a800', '#c82333'];

    return {
      labels,
      datasets: [
        {
          data: dados,
          backgroundColor: cores,
          hoverBackgroundColor: coresHover,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverBorderWidth: 3,
          hoverBorderColor: '#ffffff'
        }
      ]
    };
  }

  private obterOpcoes(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Usando legenda customizada
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: '#dee2e6',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed;
              const total = this.obterTotal();
              const percentual = total > 0 ? Math.round((value / total) * 100) : 0;
              return `${label}: ${value} (${percentual}%)`;
            }
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      elements: {
        arc: {
          borderWidth: 2
        }
      },
      interaction: {
        intersect: false
      }
    };
  }
}
