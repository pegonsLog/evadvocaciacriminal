import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChildren, QueryList, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricasGerais } from '../../../models/relatorio.model';
import { MetricaFinanceira } from '../../../models/metricas.model';
import { AnimacaoMetricasService } from './animacao-metricas.service';
import { Subject, takeUntil, delay } from 'rxjs';

@Component({
    selector: 'app-cards-metricas',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './cards-metricas.component.html',
    styleUrls: ['./cards-metricas.component.scss']
})
export class CardsMetricasComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    @Input() metricas: MetricasGerais | null = null;
    @Input() metricasAnteriores: MetricasGerais | null = null;
    @Input() carregando: boolean = false;
    @Input() animarEntrada: boolean = true;
    @Input() animarTransicoes: boolean = true;

    @ViewChildren('cardMetrica') cardsElementos!: QueryList<ElementRef>;

    metricasFormatadas: MetricaFinanceira[] = [];
    metricasAnimadas: { [key: string]: number } = {};
    animandoEntrada: boolean = false;
    animandoTransicao: boolean = false;

    private destroy$ = new Subject<void>();
    private primeiraExecucao = true;

    constructor(private animacaoService: AnimacaoMetricasService) { }

    ngOnInit(): void {
        this.processarMetricas();
    }

    ngAfterViewInit(): void {
        if (this.animarEntrada && this.metricasFormatadas.length > 0) {
            this.executarAnimacaoEntrada();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['metricas'] || changes['metricasAnteriores']) {
            const metricasAnterioresValue = changes['metricas']?.previousValue;

            if (this.animarTransicoes && !this.primeiraExecucao && metricasAnterioresValue) {
                this.executarAnimacaoTransicao(metricasAnterioresValue);
            } else {
                this.processarMetricas();
                this.primeiraExecucao = false;
            }
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private processarMetricas(): void {
        if (!this.metricas) {
            this.metricasFormatadas = [];
            return;
        }

        this.metricasFormatadas = [
            {
                nome: 'Total Recebido',
                valor: this.metricas.totalRecebido,
                valorAnterior: this.metricasAnteriores?.totalRecebido,
                variacao: this.calcularVariacao(this.metricas.totalRecebido, this.metricasAnteriores?.totalRecebido),
                percentualVariacao: this.calcularPercentualVariacao(this.metricas.totalRecebido, this.metricasAnteriores?.totalRecebido),
                tendencia: this.determinarTendencia(this.metricas.totalRecebido, this.metricasAnteriores?.totalRecebido),
                formato: 'moeda',
                icone: 'fas fa-dollar-sign',
                cor: 'success'
            },
            {
                nome: 'Total Pendente',
                valor: this.metricas.totalPendente,
                valorAnterior: this.metricasAnteriores?.totalPendente,
                variacao: this.calcularVariacao(this.metricas.totalPendente, this.metricasAnteriores?.totalPendente),
                percentualVariacao: this.calcularPercentualVariacao(this.metricas.totalPendente, this.metricasAnteriores?.totalPendente),
                tendencia: this.determinarTendencia(this.metricas.totalPendente, this.metricasAnteriores?.totalPendente, true),
                formato: 'moeda',
                icone: 'fas fa-clock',
                cor: 'warning'
            },
            {
                nome: 'Total em Atraso',
                valor: this.metricas.totalAtrasado,
                valorAnterior: this.metricasAnteriores?.totalAtrasado,
                variacao: this.calcularVariacao(this.metricas.totalAtrasado, this.metricasAnteriores?.totalAtrasado),
                percentualVariacao: this.calcularPercentualVariacao(this.metricas.totalAtrasado, this.metricasAnteriores?.totalAtrasado),
                tendencia: this.determinarTendencia(this.metricas.totalAtrasado, this.metricasAnteriores?.totalAtrasado, true),
                formato: 'moeda',
                icone: 'fas fa-exclamation-triangle',
                cor: 'danger'
            },
            {
                nome: 'Taxa de Inadimplência',
                valor: this.metricas.taxaInadimplencia,
                valorAnterior: this.metricasAnteriores?.taxaInadimplencia,
                variacao: this.calcularVariacao(this.metricas.taxaInadimplencia, this.metricasAnteriores?.taxaInadimplencia),
                percentualVariacao: this.calcularPercentualVariacao(this.metricas.taxaInadimplencia, this.metricasAnteriores?.taxaInadimplencia),
                tendencia: this.determinarTendencia(this.metricas.taxaInadimplencia, this.metricasAnteriores?.taxaInadimplencia, true),
                formato: 'percentual',
                icone: 'fas fa-chart-line',
                cor: 'info'
            },
            {
                nome: 'Contratos Ativos',
                valor: this.metricas.numeroContratosAtivos,
                valorAnterior: this.metricasAnteriores?.numeroContratosAtivos,
                variacao: this.calcularVariacao(this.metricas.numeroContratosAtivos, this.metricasAnteriores?.numeroContratosAtivos),
                percentualVariacao: this.calcularPercentualVariacao(this.metricas.numeroContratosAtivos, this.metricasAnteriores?.numeroContratosAtivos),
                tendencia: this.determinarTendencia(this.metricas.numeroContratosAtivos, this.metricasAnteriores?.numeroContratosAtivos),
                formato: 'numero',
                icone: 'fas fa-file-contract',
                cor: 'primary'
            },
            {
                nome: 'Ticket Médio',
                valor: this.metricas.ticketMedio,
                valorAnterior: this.metricasAnteriores?.ticketMedio,
                variacao: this.calcularVariacao(this.metricas.ticketMedio, this.metricasAnteriores?.ticketMedio),
                percentualVariacao: this.calcularPercentualVariacao(this.metricas.ticketMedio, this.metricasAnteriores?.ticketMedio),
                tendencia: this.determinarTendencia(this.metricas.ticketMedio, this.metricasAnteriores?.ticketMedio),
                formato: 'moeda',
                icone: 'fas fa-calculator',
                cor: 'secondary'
            }
        ];
    }

    private calcularVariacao(valorAtual: number, valorAnterior?: number): number {
        if (!valorAnterior || valorAnterior === 0) return 0;
        return valorAtual - valorAnterior;
    }

    private calcularPercentualVariacao(valorAtual: number, valorAnterior?: number): number {
        if (!valorAnterior || valorAnterior === 0) return 0;
        return ((valorAtual - valorAnterior) / valorAnterior) * 100;
    }

    private determinarTendencia(valorAtual: number, valorAnterior?: number, inverso: boolean = false): 'crescente' | 'decrescente' | 'estavel' {
        if (!valorAnterior) return 'estavel';

        const variacao = valorAtual - valorAnterior;
        const threshold = Math.abs(valorAnterior * 0.01); // 1% de threshold

        if (Math.abs(variacao) <= threshold) return 'estavel';

        if (inverso) {
            return variacao > 0 ? 'decrescente' : 'crescente';
        } else {
            return variacao > 0 ? 'crescente' : 'decrescente';
        }
    }

    formatarValor(metrica: MetricaFinanceira): string {
        switch (metrica.formato) {
            case 'moeda':
                return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                }).format(metrica.valor);

            case 'percentual':
                return new Intl.NumberFormat('pt-BR', {
                    style: 'percent',
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2
                }).format(metrica.valor / 100);

            case 'numero':
                return new Intl.NumberFormat('pt-BR').format(metrica.valor);

            case 'dias':
                return `${metrica.valor} dias`;

            default:
                return metrica.valor.toString();
        }
    }

    formatarVariacao(metrica: MetricaFinanceira): string {
        if (!metrica.variacao || metrica.variacao === 0) return '';

        const sinal = metrica.variacao > 0 ? '+' : '';

        switch (metrica.formato) {
            case 'moeda':
                return `${sinal}${new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                }).format(metrica.variacao)}`;

            case 'percentual':
                return `${sinal}${new Intl.NumberFormat('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2
                }).format(metrica.variacao)} p.p.`;

            case 'numero':
                return `${sinal}${new Intl.NumberFormat('pt-BR').format(metrica.variacao)}`;

            default:
                return `${sinal}${metrica.variacao}`;
        }
    }

    formatarPercentualVariacao(metrica: MetricaFinanceira): string {
        if (!metrica.percentualVariacao || metrica.percentualVariacao === 0) return '';

        const sinal = metrica.percentualVariacao > 0 ? '+' : '';
        return `${sinal}${new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(metrica.percentualVariacao)}%`;
    }

    obterClasseTendencia(tendencia: string): string {
        switch (tendencia) {
            case 'crescente':
                return 'text-success';
            case 'decrescente':
                return 'text-danger';
            default:
                return 'text-muted';
        }
    }

    obterIconeTendencia(tendencia: string): string {
        switch (tendencia) {
            case 'crescente':
                return 'fas fa-arrow-up';
            case 'decrescente':
                return 'fas fa-arrow-down';
            default:
                return 'fas fa-minus';
        }
    }

    trackByMetrica(index: number, metrica: MetricaFinanceira): string {
        return metrica.nome;
    }

    obterPorcentagemProgresso(valor: number): number {
        return Math.min(valor, 100);
    }

    private executarAnimacaoEntrada(): void {
        this.animandoEntrada = true;

        // Anima a entrada escalonada dos cards
        this.animacaoService.criarAnimacaoEscalonada(this.metricasFormatadas.length, 150)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (indice) => {
                    if (indice >= 0 && this.cardsElementos) {
                        const card = this.cardsElementos.toArray()[indice];
                        if (card) {
                            this.animarEntradaCard(card.nativeElement);
                        }
                    }
                },
                complete: () => {
                    this.animandoEntrada = false;
                    this.animarValoresNumericos();
                }
            });
    }

    private animarEntradaCard(elemento: HTMLElement): void {
        elemento.style.opacity = '0';
        elemento.style.transform = 'translateY(30px) scale(0.9)';
        elemento.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';

        setTimeout(() => {
            elemento.style.opacity = '1';
            elemento.style.transform = 'translateY(0) scale(1)';
        }, 50);
    }

    private executarAnimacaoTransicao(metricasAnteriores: MetricasGerais): void {
        this.animandoTransicao = true;

        // Primeiro processa as novas métricas
        this.processarMetricas();

        // Depois anima a transição dos valores
        this.animarTransicaoValores(metricasAnteriores);
    }

    private animarTransicaoValores(metricasAnteriores: MetricasGerais): void {
        if (!this.metricas) return;

        const valoresAnimacao = [
            { valorInicial: metricasAnteriores.totalRecebido, valorFinal: this.metricas.totalRecebido },
            { valorInicial: metricasAnteriores.totalPendente, valorFinal: this.metricas.totalPendente },
            { valorInicial: metricasAnteriores.totalAtrasado, valorFinal: this.metricas.totalAtrasado },
            { valorInicial: metricasAnteriores.taxaInadimplencia, valorFinal: this.metricas.taxaInadimplencia },
            { valorInicial: metricasAnteriores.numeroContratosAtivos, valorFinal: this.metricas.numeroContratosAtivos },
            { valorInicial: metricasAnteriores.ticketMedio, valorFinal: this.metricas.ticketMedio }
        ];

        this.animacaoService.animarMultiplosValores(valoresAnimacao, 1200)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (valores) => {
                    this.metricasAnimadas = {
                        'Total Recebido': valores[0],
                        'Total Pendente': valores[1],
                        'Total em Atraso': valores[2],
                        'Taxa de Inadimplência': valores[3],
                        'Contratos Ativos': valores[4],
                        'Ticket Médio': valores[5]
                    };

                    // Destaca cards que tiveram mudanças significativas
                    this.destacarMudancasSignificativas(metricasAnteriores);
                },
                complete: () => {
                    this.animandoTransicao = false;
                    this.metricasAnimadas = {};
                }
            });
    }

    private animarValoresNumericos(): void {
        if (!this.metricas) return;

        const valores = [
            this.metricas.totalRecebido,
            this.metricas.totalPendente,
            this.metricas.totalAtrasado,
            this.metricas.taxaInadimplencia,
            this.metricas.numeroContratosAtivos,
            this.metricas.ticketMedio
        ];

        const valoresAnimacao = valores.map(valor => ({ valorInicial: 0, valorFinal: valor }));

        this.animacaoService.animarMultiplosValores(valoresAnimacao, 1500)
            .pipe(
                delay(300), // Delay para começar após a animação de entrada
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (valoresAnimados) => {
                    this.metricasAnimadas = {
                        'Total Recebido': valoresAnimados[0],
                        'Total Pendente': valoresAnimados[1],
                        'Total em Atraso': valoresAnimados[2],
                        'Taxa de Inadimplência': valoresAnimados[3],
                        'Contratos Ativos': valoresAnimados[4],
                        'Ticket Médio': valoresAnimados[5]
                    };
                },
                complete: () => {
                    this.metricasAnimadas = {};
                }
            });
    }

    private destacarMudancasSignificativas(metricasAnteriores: MetricasGerais): void {
        if (!this.metricas || !this.cardsElementos) return;

        const mudancas = [
            { nome: 'Total Recebido', mudanca: Math.abs(this.metricas.totalRecebido - metricasAnteriores.totalRecebido) },
            { nome: 'Total Pendente', mudanca: Math.abs(this.metricas.totalPendente - metricasAnteriores.totalPendente) },
            { nome: 'Total em Atraso', mudanca: Math.abs(this.metricas.totalAtrasado - metricasAnteriores.totalAtrasado) },
            { nome: 'Taxa de Inadimplência', mudanca: Math.abs(this.metricas.taxaInadimplencia - metricasAnteriores.taxaInadimplencia) }
        ];

        mudancas.forEach((mudanca, index) => {
            const valorAnterior = (metricasAnteriores as any)[Object.keys(metricasAnteriores)[index]];
            const percentualMudanca = valorAnterior > 0 ? (mudanca.mudanca / valorAnterior) * 100 : 0;

            if (percentualMudanca > 5) { // Mudança significativa > 5%
                const card = this.cardsElementos.toArray()[index];
                if (card) {
                    this.animacaoService.criarEfeitoPulsacao(
                        card.nativeElement,
                        this.obterCorDestaque(mudanca.nome),
                        800
                    );
                }
            }
        });
    }

    private obterCorDestaque(nomeMetrica: string): string {
        switch (nomeMetrica) {
            case 'Total Recebido':
                return '#28a745';
            case 'Total Pendente':
                return '#ffc107';
            case 'Total em Atraso':
                return '#dc3545';
            case 'Taxa de Inadimplência':
                return '#17a2b8';
            default:
                return '#007bff';
        }
    }

    obterValorAnimado(nomeMetrica: string): number | null {
        return this.metricasAnimadas[nomeMetrica] || null;
    }

    estaAnimandoValor(nomeMetrica: string): boolean {
        return this.metricasAnimadas.hasOwnProperty(nomeMetrica);
    }

    obterValorExibicao(metrica: MetricaFinanceira): string {
        const valorAnimado = this.obterValorAnimado(metrica.nome);

        if (valorAnimado !== null) {
            // Cria uma métrica temporária com o valor animado para formatação
            const metricaAnimada = { ...metrica, valor: valorAnimado };
            return this.formatarValor(metricaAnimada);
        }

        return this.formatarValor(metrica);
    }
}
