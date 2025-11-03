export interface DadosRelatorio {
  metricas: MetricasGerais;
  dadosGraficos: DadosGraficos;
  listaContratos: ContratoResumo[];
  alertas: AlertaInadimplencia[];
}

export interface MetricasGerais {
  totalRecebido: number;
  totalPendente: number;
  totalAtrasado: number;
  taxaInadimplencia: number;
  numeroContratosAtivos: number;
  ticketMedio: number;
  tempoMedioPagamento: number;
}

export interface FiltrosRelatorio {
  dataInicio?: Date;
  dataFim?: Date;
  statusPagamento?: StatusPagamento[];
  clienteId?: string;
  valorMinimo?: number;
  valorMaximo?: number;
}

export interface ContratoResumo {
  clienteId: string;
  clienteNome: string;
  numeroContrato: string;
  valorTotal: number;
  valorPago: number;
  saldoDevedor: number;
  statusGeral: "em_dia" | "atrasado" | "quitado";
  proximoVencimento?: Date;
  diasAtraso: number;
}

export interface DadosGraficos {
  receitaMensal: DadosMensais[];
  distribuicaoStatus: DistribuicaoStatus;
  evolucaoInadimplencia: DadosMensais[];
  topClientesReceita: TopCliente[];
  evolucaoCliente?: DadosEvolucaoCliente;
}

export interface DadosMensais {
  mes: string;
  ano: number;
  valor: number;
  valorPrevisto?: number;
}

export interface DistribuicaoStatus {
  pagos: number;
  pendentes: number;
  atrasados: number;
}

export interface TopCliente {
  clienteId: string;
  clienteNome: string;
  valorTotal: number;
  percentual: number;
}

export interface AlertaInadimplencia {
  clienteId: string;
  clienteNome: string;
  numeroContrato: string;
  diasAtraso: number;
  valorEmAtraso: number;
  proximoVencimento?: Date;
  tipo: 'vencimento_proximo' | 'atraso_moderado' | 'atraso_critico';
}

export interface DadosEvolucaoCliente {
  historicoPagamentos: PagamentoHistorico[];
  projecoesFuturas: ProjecaoFutura[];
  metricasCliente: MetricasCliente;
}

export interface PagamentoHistorico {
  data: Date;
  valorPago: number;
  valorAcumulado: number;
  numeroParcela: number;
  status: 'pago' | 'atrasado';
  diasAtraso?: number;
}

export interface ProjecaoFutura {
  data: Date;
  valorEsperado: number;
  valorAcumuladoProjetado: number;
  numeroParcela: number;
}

export interface MetricasCliente {
  totalContrato: number;
  totalPago: number;
  saldoDevedor: number;
  percentualPago: number;
  mediaAtraso: number;
  proximoVencimento?: Date;
}

export enum StatusPagamento {
  PENDENTE = 'pendente',
  PAGO = 'pago',
  ATRASADO = 'atrasado'
}
