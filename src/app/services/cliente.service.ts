import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionSnapshots, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { Cliente, Pagamento, ResumoPagamento } from '../models/cliente.model';
import { ParcelaService } from './parcela.service';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private firestore = inject(Firestore);
  private parcelaService = inject(ParcelaService);
  private clientesCollection = collection(this.firestore, 'clientes');
  private pagamentosCollection = collection(this.firestore, 'pagamentos');

  private clientes: Cliente[] = [];
  private pagamentos: Pagamento[] = [];

  private clientesSubject = new BehaviorSubject<Cliente[]>([]);
  private pagamentosSubject = new BehaviorSubject<Pagamento[]>([]);

  constructor() {
    this.carregarDados();
  }

  // Clientes
  getClientes(): Observable<Cliente[]> {
    return this.clientesSubject.asObservable();
  }

  getClienteById(id: string): Cliente | undefined {
    return this.clientes.find(c => c.id === id);
  }

  async addCliente(cliente: Cliente): Promise<string> {
    console.log('🔍 [DEBUG] Cliente recebido:', cliente);

    // Preparar dados para Firestore usando apenas o formato 'contrato'
    const clienteData = {
      ...cliente,
      dataCadastro: new Date(),
      contrato: {
        ...cliente.contrato,
        dataContrato: new Date()
      }
    };
    delete (clienteData as any).id;

    console.log('📤 [DEBUG] Dados para Firestore:', clienteData);
    console.log('📋 [DEBUG] Campos presentes:', Object.keys(clienteData));
    console.log('🔐 [DEBUG] Auth state:', {
      uid: (window as any).firebase?.auth()?.currentUser?.uid,
      email: (window as any).firebase?.auth()?.currentUser?.email
    });

    const docRef = await addDoc(this.clientesCollection, clienteData);

    // Gerar parcelas automaticamente usando a nova lógica
    const clienteComId = { ...cliente, id: docRef.id };
    await this.parcelaService.gerarParcelas(clienteComId);

    return docRef.id;
  }

  async updateCliente(cliente: Cliente): Promise<void> {
    const clienteDoc = doc(this.firestore, `clientes/${cliente.id}`);

    // Preparar dados para Firestore usando apenas o formato 'contrato'
    const clienteData = {
      ...cliente,
      contrato: {
        ...cliente.contrato,
        dataContrato: cliente.contrato.dataContrato
      }
    };
    delete (clienteData as any).id;

    // Verificar se houve mudanças que requerem recálculo das parcelas
    const clienteAnterior = this.getClienteById(cliente.id);
    const precisaRecalcularParcelas = this.verificarSeNecessarioRecalcularParcelas(clienteAnterior, cliente);

    await updateDoc(clienteDoc, clienteData);

    // Recalcular parcelas se necessário, preservando histórico de pagamentos
    if (precisaRecalcularParcelas) {
      await this.parcelaService.recalcularParcelas(cliente);
    }
  }

  async deleteCliente(id: string): Promise<void> {
    const clienteDoc = doc(this.firestore, `clientes/${id}`);

    // Deletar parcelas relacionadas
    await this.parcelaService.deleteParcelasByCliente(id);

    // Deletar pagamentos relacionados
    const pagamentosQuery = query(this.pagamentosCollection, where('clienteId', '==', id));
    const snapshot = await getDocs(pagamentosQuery);
    snapshot.forEach(async (docSnapshot) => {
      await deleteDoc(docSnapshot.ref);
    });

    // Deletar o cliente
    await deleteDoc(clienteDoc);
  }

  // Pagamentos
  getPagamentos(): Observable<Pagamento[]> {
    return this.pagamentosSubject.asObservable();
  }

  getPagamentosByCliente(clienteId: string): Pagamento[] {
    return this.pagamentos.filter(p => p.clienteId === clienteId);
  }

  async addPagamento(pagamento: Pagamento): Promise<void> {
    const pagamentoData = {
      ...pagamento,
      dataPagamento: new Date()
    };
    delete (pagamentoData as any).id;
    await addDoc(this.pagamentosCollection, pagamentoData);
  }

  async updatePagamento(pagamento: Pagamento): Promise<void> {
    const pagamentoDoc = doc(this.firestore, `pagamentos/${pagamento.id}`);
    const pagamentoData = { ...pagamento };
    delete (pagamentoData as any).id;
    await updateDoc(pagamentoDoc, pagamentoData);
  }

  async deletePagamento(id: string): Promise<void> {
    const pagamentoDoc = doc(this.firestore, `pagamentos/${id}`);
    await deleteDoc(pagamentoDoc);
  }

  // Resumo de Pagamentos
  getResumoPagamentos(): ResumoPagamento[] {
    return this.clientes.map(cliente => {
      // Buscar parcelas pagas para este cliente
      const parcelasPagas = this.parcelaService.getParcelasByCliente(cliente.id)
        .filter(p => p.status === 'pago');

      const totalPago = parcelasPagas.reduce((sum, p) => sum + (p.valorPago || 0), 0);

      // Saldo devedor = (Valor total - Entrada) - Total pago
      const valorParcelado = cliente.contrato.valorTotal - cliente.contrato.valorEntrada;
      const saldoDevedor = valorParcelado - totalPago;

      // Converter parcelas pagas para formato de pagamento para compatibilidade
      const pagamentos: Pagamento[] = parcelasPagas.map(parcela => ({
        id: parcela.id,
        clienteId: parcela.clienteId,
        clienteNome: parcela.clienteNome,
        valorPago: parcela.valorPago || 0,
        dataPagamento: parcela.dataPagamento || new Date(),
        dataVencimento: parcela.dataVencimento,
        diasAtraso: parcela.diasAtraso,
        observacao: parcela.observacao
      }));

      return {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        valorCompra: cliente.contrato.valorTotal,
        numeroParcelas: cliente.contrato.numeroParcelas,
        valorParcela: cliente.contrato.valorParcela,
        totalPago: totalPago,
        saldoDevedor: saldoDevedor,
        pagamentos: pagamentos
      };
    });
  }

  getResumoPagamentoByCliente(clienteId: string): ResumoPagamento | undefined {
    const cliente = this.getClienteById(clienteId);
    if (!cliente) return undefined;

    // Buscar parcelas pagas para este cliente
    const parcelasPagas = this.parcelaService.getParcelasByCliente(clienteId)
      .filter(p => p.status === 'pago');

    const totalPago = parcelasPagas.reduce((sum, p) => sum + (p.valorPago || 0), 0);

    // Saldo devedor = (Valor total - Entrada) - Total pago
    const valorParcelado = cliente.contrato.valorTotal - cliente.contrato.valorEntrada;
    const saldoDevedor = valorParcelado - totalPago;

    // Converter parcelas pagas para formato de pagamento para compatibilidade
    const pagamentos: Pagamento[] = parcelasPagas.map(parcela => ({
      id: parcela.id,
      clienteId: parcela.clienteId,
      clienteNome: parcela.clienteNome,
      valorPago: parcela.valorPago || 0,
      dataPagamento: parcela.dataPagamento || new Date(),
      dataVencimento: parcela.dataVencimento,
      diasAtraso: parcela.diasAtraso,
      observacao: parcela.observacao
    }));

    return {
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      valorCompra: cliente.contrato.valorTotal,
      numeroParcelas: cliente.contrato.numeroParcelas,
      valorParcela: cliente.contrato.valorParcela,
      totalPago: totalPago,
      saldoDevedor: saldoDevedor,
      pagamentos: pagamentos
    };
  }

  // Utilitários
  private gerarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Verifica se é necessário recalcular as parcelas baseado nas mudanças do cliente
   */
  private verificarSeNecessarioRecalcularParcelas(clienteAnterior: Cliente | undefined, clienteNovo: Cliente): boolean {
    if (!clienteAnterior) {
      return false; // Cliente novo, parcelas já serão geradas
    }

    const contratoAnterior = clienteAnterior.contrato;
    const contratoNovo = clienteNovo.contrato;

    // Verificar mudanças que afetam o cálculo das parcelas
    return (
      contratoAnterior.valorTotal !== contratoNovo.valorTotal ||
      contratoAnterior.valorEntrada !== contratoNovo.valorEntrada ||
      contratoAnterior.numeroParcelas !== contratoNovo.numeroParcelas ||
      contratoAnterior.dataPrimeiroVencimento?.getTime() !== contratoNovo.dataPrimeiroVencimento?.getTime()
    );
  }


  private carregarDados(): void {
    // Carregar clientes do Firestore usando onSnapshot
    onSnapshot(this.clientesCollection,
      (snapshot) => {
        this.clientes = snapshot.docs.map(doc => {
          const data = doc.data() as any;

          // Usar apenas o formato 'contrato'
          const contratoData = data.contrato;

          return {
            id: doc.id,
            ...data,
            dataCadastro: data.dataCadastro?.toDate ? data.dataCadastro.toDate() : new Date(data.dataCadastro),
            contrato: {
              numeroContrato: contratoData?.numeroContrato || '',
              valorEntrada: contratoData?.valorEntrada || 0,
              valorTotal: contratoData?.valorTotal || 0,
              numeroParcelas: contratoData?.numeroParcelas || 0,
              valorParcela: contratoData?.valorParcela || 0,
              dataContrato: contratoData?.dataContrato?.toDate ?
                contratoData.dataContrato.toDate() :
                new Date(contratoData?.dataContrato || new Date()),
              dataPrimeiroVencimento: contratoData?.dataPrimeiroVencimento?.toDate ?
                contratoData.dataPrimeiroVencimento.toDate() :
                (contratoData?.dataPrimeiroVencimento ? new Date(contratoData.dataPrimeiroVencimento) : undefined),

              relatorioContratosPendentes: contratoData?.relatorioContratosPendentes
            }
          } as Cliente;
        });
        this.clientesSubject.next([...this.clientes]);
      },
      (error) => {
        console.error('Erro ao carregar clientes:', error);
      }
    );

    // Carregar pagamentos do Firestore usando onSnapshot
    onSnapshot(this.pagamentosCollection,
      (snapshot) => {
        this.pagamentos = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            dataPagamento: data.dataPagamento ? (data.dataPagamento?.toDate ? data.dataPagamento.toDate() : new Date(data.dataPagamento)) : undefined,
            dataVencimento: data.dataVencimento ? (data.dataVencimento?.toDate ? data.dataVencimento.toDate() : new Date(data.dataVencimento)) : undefined
          } as Pagamento;
        });
        this.pagamentosSubject.next([...this.pagamentos]);
      },
      (error) => {
        console.error('Erro ao carregar pagamentos:', error);
      }
    );
  }
}
