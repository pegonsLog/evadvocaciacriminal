import { Injectable } from '@angular/core';
import { Cliente, Parcela } from '../models/cliente.model';
import { AlertaInadimplencia } from '../models/relatorio.model';

@Injectable({
    providedIn: 'root'
})
export class MetricasService {

    /**
     * Calcula a taxa de inadimplência baseada nas parcelas em atraso
     */
    calcularTaxaInadimplencia(parcelas: Parcela[]): number {
        if (parcelas.length === 0) return 0;

        const parcelasAtrasadas = parcelas.filter(p => p.status === 'atrasado');
        return (parcelasAtrasadas.length / parcelas.length) * 100;
    }

    /**
     * Calcula a taxa de inadimplência por período específico
     */
    calcularTaxaInadimplenciaPorPeriodo(parcelas: Parcela[], dataInicio: Date, dataFim: Date): number {
        const parcelasNoPeriodo = parcelas.filter(parcela => {
            const dataReferencia = parcela.dataVencimento;
            return dataReferencia >= dataInicio && dataReferencia <= dataFim;
        });

        return this.calcularTaxaInadimplencia(parcelasNoPeriodo);
    }

    /**
     * Calcula a taxa de inadimplência por cliente
     */
    calcularTaxaInadimplenciaPorCliente(parcelas: Parcela[]): Map<string, number> {
        const taxasPorCliente = new Map<string, number>();

        // Agrupar parcelas por cliente
        const parcelasPorCliente = new Map<string, Parcela[]>();
        parcelas.forEach(parcela => {
            const clienteParcelas = parcelasPorCliente.get(parcela.clienteId) || [];
            clienteParcelas.push(parcela);
            parcelasPorCliente.set(parcela.clienteId, clienteParcelas);
        });

        // Calcular taxa para cada cliente
        parcelasPorCliente.forEach((parcelasCliente, clienteId) => {
            const taxa = this.calcularTaxaInadimplencia(parcelasCliente);
            taxasPorCliente.set(clienteId, taxa);
        });

        return taxasPorCliente;
    }

    /**
     * Calcula o ticket médio dos contratos
     */
    calcularTicketMedio(clientes: Cliente[]): number {
        if (clientes.length === 0) return 0;

        const valorTotal = clientes.reduce((sum, cliente) => sum + cliente.contrato.valorTotal, 0);
        return valorTotal / clientes.length;
    }

    /**
     * Calcula o ticket médio por período baseado na data do contrato
     */
    calcularTicketMedioPorPeriodo(clientes: Cliente[], dataInicio: Date, dataFim: Date): number {
        const clientesNoPeriodo = clientes.filter(cliente => {
            const dataContrato = cliente.contrato.dataContrato;
            return dataContrato >= dataInicio && dataContrato <= dataFim;
        });

        return this.calcularTicketMedio(clientesNoPeriodo);
    }

    /**
     * Calcula o tempo médio de pagamento em dias
     */
    calcularTempoMedioPagamento(parcelas: Parcela[]): number {
        const parcelasPagas = parcelas.filter(p => p.status === 'pago' && p.dataPagamento);

        if (parcelasPagas.length === 0) return 0;

        const temposTotais = parcelasPagas.map(parcela => {
            if (!parcela.dataPagamento) return 0;

            const dataVencimento = new Date(parcela.dataVencimento);
            const dataPagamento = new Date(parcela.dataPagamento);

            // Calcular diferença em dias (pode ser negativo se pago antecipadamente)
            const diffTime = dataPagamento.getTime() - dataVencimento.getTime();
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        });

        const somaTempos = temposTotais.reduce((sum, tempo) => sum + tempo, 0);
        return somaTempos / parcelasPagas.length;
    }

    /**
     * Calcula o tempo médio de pagamento por cliente
     */
    calcularTempoMedioPagamentoPorCliente(parcelas: Parcela[]): Map<string, number> {
        const temposPorCliente = new Map<string, number>();

        // Agrupar parcelas por cliente
        const parcelasPorCliente = new Map<string, Parcela[]>();
        parcelas.forEach(parcela => {
            const clienteParcelas = parcelasPorCliente.get(parcela.clienteId) || [];
            clienteParcelas.push(parcela);
            parcelasPorCliente.set(parcela.clienteId, clienteParcelas);
        });

        // Calcular tempo médio para cada cliente
        parcelasPorCliente.forEach((parcelasCliente, clienteId) => {
            const tempoMedio = this.calcularTempoMedioPagamento(parcelasCliente);
            temposPorCliente.set(clienteId, tempoMedio);
        });

        return temposPorCliente;
    }

    /**
     * Identifica clientes com maior risco de inadimplência
     */
    identificarClientesRiscoInadimplencia(parcelas: Parcela[], limiteRisco: number = 50): string[] {
        const taxasPorCliente = this.calcularTaxaInadimplenciaPorCliente(parcelas);

        return Array.from(taxasPorCliente.entries())
            .filter(([_, taxa]) => taxa >= limiteRisco)
            .sort(([_, taxaA], [__, taxaB]) => taxaB - taxaA)
            .map(([clienteId, _]) => clienteId);
    }

    /**
     * Desenvolve lógica de identificação de alertas de cobrança
     */
    identificarAlertasCobranca(parcelas: Parcela[]): AlertaInadimplencia[] {
        const alertas: AlertaInadimplencia[] = [];
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        parcelas.forEach(parcela => {
            // Alertas para parcelas vencidas
            if (parcela.status === 'atrasado') {
                let tipo: AlertaInadimplencia['tipo'] = 'atraso_moderado';

                // Classificar por gravidade do atraso
                if (parcela.diasAtraso >= 60) {
                    tipo = 'atraso_critico';
                } else if (parcela.diasAtraso >= 30) {
                    tipo = 'atraso_moderado';
                }

                alertas.push({
                    clienteId: parcela.clienteId,
                    clienteNome: parcela.clienteNome,
                    numeroContrato: parcela.numeroContrato,
                    diasAtraso: parcela.diasAtraso,
                    valorEmAtraso: parcela.valorParcela,
                    tipo
                });
            }

            // Alertas para vencimentos próximos
            if (parcela.status === 'pendente') {
                const dataVencimento = new Date(parcela.dataVencimento);
                dataVencimento.setHours(0, 0, 0, 0);

                const diasParaVencimento = Math.ceil(
                    (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
                );

                // Alertar para vencimentos nos próximos 7 dias
                if (diasParaVencimento <= 7 && diasParaVencimento >= 0) {
                    alertas.push({
                        clienteId: parcela.clienteId,
                        clienteNome: parcela.clienteNome,
                        numeroContrato: parcela.numeroContrato,
                        diasAtraso: 0,
                        valorEmAtraso: 0,
                        proximoVencimento: parcela.dataVencimento,
                        tipo: 'vencimento_proximo'
                    });
                }
            }
        });

        // Ordenar alertas por prioridade
        return this.ordenarAlertasPorPrioridade(alertas);
    }

    /**
     * Identifica alertas específicos por cliente
     */
    identificarAlertasPorCliente(clienteId: string, parcelas: Parcela[]): AlertaInadimplencia[] {
        const parcelasCliente = parcelas.filter(p => p.clienteId === clienteId);
        return this.identificarAlertasCobranca(parcelasCliente);
    }

    /**
     * Calcula métricas de performance de cobrança
     */
    calcularMetricasPerformanceCobranca(parcelas: Parcela[]): {
        efetividadeCobranca: number;
        tempoMedioResolucao: number;
        valorRecuperado: number;
        parcelasRecuperadas: number;
    } {
        const parcelasAtrasadas = parcelas.filter(p => p.status === 'atrasado');
        const parcelasRecuperadas = parcelas.filter(p =>
            p.status === 'pago' && p.diasAtraso > 0
        );

        // Efetividade da cobrança (% de parcelas atrasadas que foram pagas)
        const totalParcelasComAtraso = parcelasAtrasadas.length + parcelasRecuperadas.length;
        const efetividadeCobranca = totalParcelasComAtraso > 0
            ? (parcelasRecuperadas.length / totalParcelasComAtraso) * 100
            : 0;

        // Tempo médio de resolução (dias entre vencimento e pagamento para parcelas recuperadas)
        const tempoMedioResolucao = parcelasRecuperadas.length > 0
            ? parcelasRecuperadas.reduce((sum, p) => sum + (p.diasAtraso || 0), 0) / parcelasRecuperadas.length
            : 0;

        // Valor total recuperado
        const valorRecuperado = parcelasRecuperadas.reduce((sum, p) => sum + (p.valorPago || 0), 0);

        return {
            efetividadeCobranca,
            tempoMedioResolucao,
            valorRecuperado,
            parcelasRecuperadas: parcelasRecuperadas.length
        };
    }

    /**
     * Calcula tendências de pagamento
     */
    calcularTendenciasPagamento(parcelas: Parcela[]): {
        tendenciaInadimplencia: 'crescente' | 'estavel' | 'decrescente';
        tendenciaTempoMedio: 'crescente' | 'estavel' | 'decrescente';
        projecaoProximoMes: number;
    } {
        const hoje = new Date();
        const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const doisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);

        // Calcular taxas de inadimplência dos últimos 3 meses
        const taxaMesAtual = this.calcularTaxaInadimplenciaPorPeriodo(
            parcelas, mesAtual, hoje
        );
        const taxaMesAnterior = this.calcularTaxaInadimplenciaPorPeriodo(
            parcelas, mesAnterior, mesAtual
        );
        const taxaDoisMesesAtras = this.calcularTaxaInadimplenciaPorPeriodo(
            parcelas, doisMesesAtras, mesAnterior
        );

        // Determinar tendência de inadimplência
        let tendenciaInadimplencia: 'crescente' | 'estavel' | 'decrescente' = 'estavel';
        if (taxaMesAtual > taxaMesAnterior && taxaMesAnterior > taxaDoisMesesAtras) {
            tendenciaInadimplencia = 'crescente';
        } else if (taxaMesAtual < taxaMesAnterior && taxaMesAnterior < taxaDoisMesesAtras) {
            tendenciaInadimplencia = 'decrescente';
        }

        // Calcular tempo médio dos últimos 3 meses
        const tempoMesAtual = this.calcularTempoMedioPagamentoPorPeriodo(parcelas, mesAtual, hoje);
        const tempoMesAnterior = this.calcularTempoMedioPagamentoPorPeriodo(parcelas, mesAnterior, mesAtual);
        const tempoDoisMesesAtras = this.calcularTempoMedioPagamentoPorPeriodo(parcelas, doisMesesAtras, mesAnterior);

        // Determinar tendência do tempo médio
        let tendenciaTempoMedio: 'crescente' | 'estavel' | 'decrescente' = 'estavel';
        if (tempoMesAtual > tempoMesAnterior && tempoMesAnterior > tempoDoisMesesAtras) {
            tendenciaTempoMedio = 'crescente';
        } else if (tempoMesAtual < tempoMesAnterior && tempoMesAnterior < tempoDoisMesesAtras) {
            tendenciaTempoMedio = 'decrescente';
        }

        // Projeção simples baseada na tendência linear
        const projecaoProximoMes = this.calcularProjecaoLinear([
            taxaDoisMesesAtras, taxaMesAnterior, taxaMesAtual
        ]);

        return {
            tendenciaInadimplencia,
            tendenciaTempoMedio,
            projecaoProximoMes
        };
    }

    /**
     * Métodos auxiliares privados
     */

    private calcularTempoMedioPagamentoPorPeriodo(parcelas: Parcela[], dataInicio: Date, dataFim: Date): number {
        const parcelasNoPeriodo = parcelas.filter(parcela => {
            if (!parcela.dataPagamento) return false;
            const dataPagamento = new Date(parcela.dataPagamento);
            return dataPagamento >= dataInicio && dataPagamento <= dataFim;
        });

        return this.calcularTempoMedioPagamento(parcelasNoPeriodo);
    }

    private ordenarAlertasPorPrioridade(alertas: AlertaInadimplencia[]): AlertaInadimplencia[] {
        const ordemPrioridade = {
            'atraso_critico': 3,
            'atraso_moderado': 2,
            'vencimento_proximo': 1
        };

        return alertas.sort((a, b) => {
            // Primeiro por tipo de alerta (mais crítico primeiro)
            if (ordemPrioridade[a.tipo] !== ordemPrioridade[b.tipo]) {
                return ordemPrioridade[b.tipo] - ordemPrioridade[a.tipo];
            }

            // Depois por dias de atraso (maior atraso primeiro)
            if (a.diasAtraso !== b.diasAtraso) {
                return b.diasAtraso - a.diasAtraso;
            }

            // Por último por valor em atraso (maior valor primeiro)
            return b.valorEmAtraso - a.valorEmAtraso;
        });
    }

    private calcularProjecaoLinear(valores: number[]): number {
        if (valores.length < 2) return valores[0] || 0;

        // Regressão linear simples
        const n = valores.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = valores;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Projetar para o próximo período
        return slope * n + intercept;
    }
}
