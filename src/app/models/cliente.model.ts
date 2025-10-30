export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  dataCadastro: Date;
  compra: Compra;
}

export interface Compra {
  numeroContrato: string;
  valorEntrada: number;
  valorTotal: number;
  numeroParcelas: number;
  valorParcela: number;
  dataCompra: Date;
  diaVencimento: number; // Dia do mês para vencimento (ex: 10 = todo dia 10)
  estimativaValorPrevisto?: number;
  relatorioContratosPendentes?: string;
}

export interface Parcela {
  id: string;
  clienteId: string;
  clienteNome: string;
  numeroContrato: string;
  numeroParcela: number; // 1, 2, 3...
  valorParcela: number;
  dataVencimento: Date;
  dataPagamento?: Date;
  valorPago?: number;
  diasAtraso: number;
  status: 'pendente' | 'pago' | 'atrasado';
  observacao?: string;
}

export interface Pagamento {
  id: string;
  clienteId: string;
  clienteNome: string;
  valorPago: number;
  dataPagamento: Date;
  dataVencimento?: Date;
  diasAtraso?: number;
  observacao?: string;
}

export interface ResumoPagamento {
  clienteId: string;
  clienteNome: string;
  valorCompra: number;
  numeroParcelas: number;
  valorParcela: number;
  totalPago: number;
  saldoDevedor: number;
  pagamentos: Pagamento[];
}
