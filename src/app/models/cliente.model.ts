export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  dataCadastro: Date;
  contrato: Contrato;
}

export interface Contrato {
  numeroContrato: string;
  valorEntrada: number;
  valorTotal: number;
  numeroParcelas: number;
  valorParcela: number;
  dataContrato: Date;
  dataPrimeiroVencimento: Date; // Data específica do primeiro vencimento
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
