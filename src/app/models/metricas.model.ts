export interface MetricaFinanceira {
    nome: string;
    valor: number;
    valorAnterior?: number;
    variacao?: number;
    percentualVariacao?: number;
    tendencia: 'crescente' | 'decrescente' | 'estavel';
    formato: 'moeda' | 'percentual' | 'numero' | 'dias';
    icone?: string;
    cor?: string;
}

export interface MetricasComparativas {
    periodo: string;
    metricas: {
        receita: MetricaComparativa;
        inadimplencia: MetricaComparativa;
        novosContratos: MetricaComparativa;
        ticketMedio: MetricaComparativa;
    };
}

export interface MetricaComparativa {
    atual: number;
    anterior: number;
    meta?: number;
    variacao: number;
    percentualVariacao: number;
    atingiuMeta: boolean;
}

export interface IndicadorPerformance {
    nome: string;
    valor: number;
    meta: number;
    percentualAtingido: number;
    status: 'excelente' | 'bom' | 'regular' | 'ruim';
    descricao: string;
}

export interface MetricasTemporais {
    diarias: MetricaDiaria[];
    semanais: MetricaSemanal[];
    mensais: MetricaMensal[];
    anuais: MetricaAnual[];
}

export interface MetricaDiaria {
    data: Date;
    receita: number;
    pagamentos: number;
    novosContratos: number;
}

export interface MetricaSemanal {
    semana: number;
    ano: number;
    inicioSemana: Date;
    fimSemana: Date;
    receita: number;
    pagamentos: number;
    novosContratos: number;
    inadimplencia: number;
}

export interface MetricaMensal {
    mes: number;
    ano: number;
    receita: number;
    receitaPrevista: number;
    pagamentos: number;
    novosContratos: number;
    contratosQuitados: number;
    inadimplencia: number;
    ticketMedio: number;
}

export interface MetricaAnual {
    ano: number;
    receita: number;
    receitaPrevista: number;
    crescimento: number;
    novosClientes: number;
    retencaoClientes: number;
    inadimplenciaMedia: number;
}

export interface MetricasSegmentacao {
    porCliente: MetricaCliente[];
    porContrato: MetricaContrato[];
    porStatus: MetricaStatus[];
    porPeriodo: MetricaPeriodo[];
}

export interface MetricaCliente {
    clienteId: string;
    clienteNome: string;
    valorTotal: number;
    valorPago: number;
    saldoDevedor: number;
    numeroContratos: number;
    taxaAdimplencia: number;
    tempoMedioAtraso: number;
    risco: 'baixo' | 'medio' | 'alto';
}

export interface MetricaContrato {
    numeroContrato: string;
    clienteNome: string;
    valorTotal: number;
    percentualPago: number;
    diasAtraso: number;
    status: string;
    previsaoQuitacao?: Date;
}

export interface MetricaStatus {
    status: string;
    quantidade: number;
    valor: number;
    percentualQuantidade: number;
    percentualValor: number;
}

export interface MetricaPeriodo {
    periodo: string;
    receita: number;
    despesas?: number;
    lucro?: number;
    margemLucro?: number;
    crescimento?: number;
}

export interface ConfiguracaoMetricas {
    metricas: string[];
    periodo: {
        inicio: Date;
        fim: Date;
    };
    agrupamento: 'dia' | 'semana' | 'mes' | 'ano';
    comparacao: boolean;
    metas: { [metrica: string]: number };
}

export interface AlertaMetrica {
    metrica: string;
    valor: number;
    limite: number;
    tipo: 'minimo' | 'maximo';
    severidade: 'info' | 'warning' | 'error';
    mensagem: string;
    dataAlerta: Date;
}
