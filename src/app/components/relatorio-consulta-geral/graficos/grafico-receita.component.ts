import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

export interface DadosMensais {
  mes: string;
  ano: number;
  valor: number;
  valorPrevisto?: number;
}

@Component({
  selector: 'app-grafico-receita',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card h-100">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">
          <i class="fas fa-chart-line me-2"></i>
          Receita Mensal
        </h5>
        <div class="btn-group btn-group-sm" role="group">
          <button
            type="button"
            class="btn btn-outline-primary"
            [class.active]="tipoGrafico === 'line'"
            (click)="alterarTipoGrafico('line')">
            <i class="fas fa-chart-line"></i>
          </button>
          <button
            type="button"
            class="btn btn-outline-primary"
            [class.active]="tipoGrafico === 'bar'"
            (click)="alterarTipoGrafico('bar')">
            <i class="fas fa-chart-bar"></i>
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="chart-container" style="position: relative; height: 300px;">
          <canvas #chartCanvas></canvas>
        </div>
        <div class="mt-3" *ngIf="dadosReceita && dadosReceita.length > 0">
          <div class="row text-center">
            <div class="col-4">
              <small class="text-muted">Total Realizado</small>
              <div class="fw-bold text-success">{{ totalRealizado | currency:'BRL':'symbol':'1.2-2' }}</div>
            </div>
            <div class="col-4">
              <small class="text-muted">Total Previsto</small>
              <div class="fw-bold text-primary">{{ totalPrevisto | currency:'BRL':'symbol':'1.2-2' }}</div>
            </div>
            <div class="col-4">
              <small class="text-muted">Variação</small>
              <div class="fw-bold" [class.text-success]="variacao >= 0" [class.text-danger]="variacao < 0">
                {{ variacao >= 0 ? '+' : '' }}{{ variacao.toFixed(1) }}%
              </div>
            </div>
          </div>
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
      background-color: var(--bs-primary);
      border-color: var(--bs-primary);
      color: white;
    }

    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .text-success {
      color: #28a745 !important;
    }

    .text-danger {
      color: #dc3545 !important;
    }

    .text-primary {
      color: #007bff !important;
    }
  `]
})
export class GraficoReceitaComponent implements OnInit, OnDestroy, OnChanges {
  @Input() dadosReceita: DadosMensais[] = [];
  @Input() carregando: boolean = false;
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  tipoGrafico: ChartType = 'line';

  // Métricas calculadas
  totalRealizado: number = 0;
  totalPrevisto: number = 0;
  variacao: number = 0;

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.criarGrafico();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dadosReceita'] && !changes['dadosReceita'].firstChange) {
      this.atualizarGrafico();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  alterarTipoGrafico(tipo: ChartType): void {
    this.tipoGrafico = tipo;
    this.atualizarGrafico();
  }

  private criarGrafico(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: this.tipoGrafico,
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

    // Recriar o gráfico com o novo tipo ao invés de alterar o tipo diretamente
    this.criarGrafico();
    this.chart.data = this.prepararDados();
    this.chart.update('active');
    this.calcularMetricas();
  }

  private prepararDados() {
    const labels = this.dadosReceita.map(item => `${item.mes}/${item.ano}`);
    const valoresRealizados = this.dadosReceita.map(item => item.valor);
    const valoresPrevistos = this.dadosReceita.map(item => item.valorPrevisto || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Receita Realizada',
          data: valoresRealizados,
          borderColor: '#28a745',
          backgroundColor: this.tipoGrafico === 'bar' ? '#28a745' : 'rgba(40, 167, 69, 0.1)',
          borderWidth: 2,
          fill: this.tipoGrafico === 'line',
          tension: 0.4
        },
        {
          label: 'Receita Prevista',
          data: valoresPrevistos,
          borderColor: '#007bff',
          backgroundColor: this.tipoGrafico === 'bar' ? '#007bff' : 'rgba(0, 123, 255, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4
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
            padding: 20
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
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              const numValue = typeof value === 'number' ? value : 0;
              return `${label}: ${new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(numValue)}`;
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
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: (value) => {
              const numValue = typeof value === 'number' ? value : 0;
              return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(numValue);
            }
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
    this.totalRealizado = this.dadosReceita.reduce((total, item) => total + item.valor, 0);
    this.totalPrevisto = this.dadosReceita.reduce((total, item) => total + (item.valorPrevisto || 0), 0);

    if (this.totalPrevisto > 0) {
      this.variacao = ((this.totalRealizado - this.totalPrevisto) / this.totalPrevisto) * 100;
    } else {
      this.variacao = 0;
    }
  }
}
