import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { DadosEvolucaoCliente } from '../../../models/relatorio.model';

@Component({
  selector: 'app-grafico-evolucao-cliente',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card h-100">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">
          <i class="fas fa-chart-area me-2"></i>
          Evolução de Pagamentos
        </h5>
        <div class="btn-group btn-group-sm" role="group">
          <button
            type="button"
            class="btn btn-outline-primary"
            [class.active]="visualizacao === 'valores'"
            (click)="alterarVisualizacao('valores')">
            Valores
          </button>
          <button
            type="button"
            class="btn btn-outline-primary"
            [class.active]="visualizacao === 'percentual'"
            (click)="alterarVisualizacao('percentual')">
            %
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="chart-container" style="position: relative; height: 300px;">
          <canvas #chartCanvas></canvas>
        </div>
        <div class="mt-3" *ngIf="dadosEvolucao?.metricasCliente">
          <div class="row">
            <div class="col-6 col-md-3">
              <small class="text-muted">Total do Contrato</small>
              <div class="fw-bold text-primary">
                {{ dadosEvolucao!.metricasCliente.totalContrato | currency:'BRL':'symbol':'1.2-2' }}
              </div>
            </div>
            <div class="col-6 col-md-3">
              <small class="text-muted">Total Pago</small>
              <div class="fw-bold text-success">
                {{ dadosEvolucao!.metricasCliente.totalPago | currency:'BRL':'symbol':'1.2-2' }}
              </div>
            </div>
            <div class="col-6 col-md-3">
              <small class="text-muted">Saldo Devedor</small>
              <div class="fw-bold" [class.text-warning]="dadosEvolucao!.metricasCliente.saldoDevedor > 0" [class.text-success]="dadosEvolucao!.metricasCliente.saldoDevedor === 0">
                {{ dadosEvolucao!.metricasCliente.saldoDevedor | currency:'BRL':'symbol':'1.2-2' }}
              </div>
            </div>
            <div class="col-6 col-md-3">
              <small class="text-muted">Progresso</small>
              <div class="fw-bold text-info">
                {{ dadosEvolucao!.metricasCliente.percentualPago.toFixed(1) }}%
              </div>
            </div>
          </div>
          <div class="row mt-3 pt-3 border-top" *ngIf="dadosEvolucao!.metricasCliente.mediaAtraso > 0 || dadosEvolucao!.metricasCliente.proximoVencimento">
            <div class="col-6" *ngIf="dadosEvolucao!.metricasCliente.mediaAtraso > 0">
              <small class="text-muted">Média de Atraso</small>
              <div class="fw-bold text-warning">
                {{ dadosEvolucao!.metricasCliente.mediaAtraso.toFixed(1) }} dias
              </div>
            </div>
            <div class="col-6" *ngIf="dadosEvolucao!.metricasCliente.proximoVencimento">
              <small class="text-muted">Próximo Vencimento</small>
              <div class="fw-bold">
                {{ dadosEvolucao!.metricasCliente.proximoVencimento | date:'dd/MM/yyyy' }}
              </div>
            </div>
          </div>
        </div>
        <div class="text-center py-4" *ngIf="!dadosEvolucao || (!dadosEvolucao.historicoPagamentos?.length && !dadosEvolucao.projecoesFuturas?.length)">
          <i class="fas fa-chart-area fa-3x text-muted mb-3"></i>
          <p class="text-muted">Nenhum dado de evolução disponível</p>
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

    .text-warning {
      color: #ffc107 !important;
    }

    .text-primary {
      color: #007bff !important;
    }

    .text-info {
      color: #17a2b8 !important;
    }

    .border-top {
      border-top: 1px solid #dee2e6 !important;
    }

    @media (max-width: 768px) {
      .col-6.col-md-3 {
        margin-bottom: 1rem;
      }
    }
  `]
})
export class GraficoEvolucaoClienteComponent implements OnInit, OnDestroy, OnChanges {
  @Input() dadosEvolucao: DadosEvolucaoCliente | null = null;
  @Input() carregando: boolean = false;
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  visualizacao: 'valores' | 'percentual' = 'valores';

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.criarGrafico();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dadosEvolucao'] && !changes['dadosEvolucao'].firstChange) {
      this.atualizarGrafico();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  alterarVisualizacao(tipo: 'valores' | 'percentual'): void {
    this.visualizacao = tipo;
    this.atualizarGrafico();
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
  }

  private atualizarGrafico(): void {
    if (!this.chart) {
      this.criarGrafico();
      return;
    }

    this.chart.data = this.prepararDados();
    const novasOpcoes = this.obterOpcoes();
    if (novasOpcoes) {
      Object.assign(this.chart.options, novasOpcoes);
    }
    this.chart.update('active');
  }

  private prepararDados() {
    if (!this.dadosEvolucao) {
      return {
        labels: [],
        datasets: []
      };
    }

    const historico = this.dadosEvolucao.historicoPagamentos || [];
    const projecoes = this.dadosEvolucao.projecoesFuturas || [];
    const totalContrato = this.dadosEvolucao.metricasCliente?.totalContrato || 1;

    // Combinar dados históricos e projeções
    const todosOsDados = [
      ...historico.map(h => ({
        data: h.data,
        valorAcumulado: h.valorAcumulado,
        tipo: 'historico' as const,
        status: h.status,
        numeroParcela: h.numeroParcela
      })),
      ...projecoes.map(p => ({
        data: p.data,
        valorAcumulado: p.valorAcumuladoProjetado,
        tipo: 'projecao' as const,
        status: 'projetado' as const,
        numeroParcela: p.numeroParcela
      }))
    ].sort((a, b) => a.data.getTime() - b.data.getTime());

    const labels = todosOsDados.map(item => {
      const data = new Date(item.data);
      return `${data.getMonth() + 1}/${data.getFullYear()}`;
    });

    // Separar dados históricos e projeções
    const dadosHistoricos = todosOsDados
      .filter(item => item.tipo === 'historico')
      .map(item => this.visualizacao === 'valores'
        ? item.valorAcumulado
        : (item.valorAcumulado / totalContrato) * 100
      );

    const dadosProjecoes = todosOsDados
      .filter(item => item.tipo === 'projecao')
      .map(item => this.visualizacao === 'valores'
        ? item.valorAcumulado
        : (item.valorAcumulado / totalContrato) * 100
      );

    const datasets = [];

    // Dataset para dados históricos
    if (dadosHistoricos.length > 0) {
      datasets.push({
        label: 'Pagamentos Realizados',
        data: dadosHistoricos,
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: historico.map(h => h.status === 'atrasado' ? '#ffc107' : '#28a745'),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6
      });
    }

    // Dataset para projeções
    if (dadosProjecoes.length > 0) {
      datasets.push({
        label: 'Projeção Futura',
        data: dadosProjecoes,
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.05)',
        borderWidth: 2,
        borderDash: [10, 5],
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#007bff',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4
      });
    }

    return {
      labels: labels,
      datasets: datasets
    };
  }

  private obterOpcoes(): ChartConfiguration['options'] {
    const isPercentual = this.visualizacao === 'percentual';

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
              const value = typeof context.parsed.y === 'number' ? context.parsed.y : 0;

              if (isPercentual) {
                return `${label}: ${value.toFixed(1)}%`;
              } else {
                return `${label}: ${new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(value)}`;
              }
            },
            afterLabel: (context) => {
              // Adicionar informações extras no tooltip
              const dataIndex = context.dataIndex;
              const historico = this.dadosEvolucao?.historicoPagamentos || [];

              if (dataIndex < historico.length) {
                const pagamento = historico[dataIndex];
                const extras = [`Parcela: ${pagamento.numeroParcela}`];

                if (pagamento.diasAtraso && pagamento.diasAtraso > 0) {
                  extras.push(`Atraso: ${pagamento.diasAtraso} dias`);
                }

                return extras;
              }

              return [];
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
          max: isPercentual ? 100 : undefined,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: (value) => {
              const numValue = typeof value === 'number' ? value : 0;
              if (isPercentual) {
                return `${numValue}%`;
              } else {
                return new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(numValue);
              }
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
}
