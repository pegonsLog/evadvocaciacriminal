import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionSnapshots, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Cliente, Pagamento, ResumoPagamento } from '../models/cliente.model';
import { ParcelaService } from './parcela.service';
import { CacheService } from './cache.service';
import { OfflineDataService } from './offline-data.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private firestore = inject(Firestore);
  private parcelaService = inject(ParcelaService);
  private cacheService = inject(CacheService);
  private offlineDataService = inject(OfflineDataService);
  private logger = inject(LoggerService);
  private clientesCollection = collection(this.firestore, 'clientes');
  private pagamentosCollection = collection(this.firestore, 'pagamentos');

  private clientes: Cliente[] = [];
  private pagamentos: Pagamento[] = [];

  private clientesSubject = new BehaviorSubject<Cliente[]>([]);
  private pagamentosSubject = new BehaviorSubject<Pagamento[]>([]);

  private listenersInitialized = false;

  constructor() {
    // Configurar cache para dados críticos
    this.cacheService.configure({
      ttl: 10 * 60 * 1000, // 10 minutos para dados críticos
      maxSize: 200,
      enableOfflineMode: true
    });

    // Inicializar listeners após a configuração
    this.inicializarListeners();
  }

  private inicializarListeners(): void {
    if (!this.listenersInitialized) {
      this.logger.service('Inicializando listeners...');
      this.carregarDados();
      this.listenersInitialized = true;
    }
  }

  // Clientes
  getClientes(): Observable<Cliente[]> {
    return this.clientesSubject.asObservable();
  }

  /**
   * Obtém clientes com cache para melhor performance offline
   */
  getClientesWithCache(): Observable<Cliente[]> {
    return this.cacheService.get(
      'clientes_all',
      () => this.getClientes(),
      15 * 60 * 1000 // 15 minutos de cache
    );
  }

  getClienteById(id: string): Cliente | undefined {
    return this.clientes.find(c => c.id === id);
  }

  /**
   * Obtém cliente por ID com cache
   */
  getClienteByIdWithCache(id: string): Observable<Cliente | undefined> {
    return this.cacheService.get(
      `cliente_${id}`,
      () => of(this.getClienteById(id)),
      20 * 60 * 1000 // 20 minutos de cache para dados individuais
    );
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
    this.logger.service(`Cliente adicionado ao Firestore com ID: ${docRef.id}`);

    // Invalidar cache relacionado
    this.cacheService.invalidatePattern('clientes_.*');
    this.cacheService.delete(`cliente_${docRef.id}`);

    // Gerar parcelas automaticamente usando a nova lógica
    const clienteComId = { ...cliente, id: docRef.id };
    await this.parcelaService.gerarParcelas(clienteComId);
    this.logger.service('Parcelas geradas para o cliente');

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

    // Invalidar cache relacionado
    this.cacheService.invalidatePattern('clientes_.*');
    this.cacheService.delete(`cliente_${cliente.id}`);
    this.cacheService.delete(`resumo_pagamento_${cliente.id}`);

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

    // Processar deletions sequencialmente para evitar sobrecarga
    for (const docSnapshot of snapshot.docs) {
      try {
        await deleteDoc(docSnapshot.ref);
        // Pequeno delay para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Erro ao deletar pagamento ${docSnapshot.id}:`, error);
      }
    }

    // Deletar o cliente
    await deleteDoc(clienteDoc);

    // Invalidar cache relacionado
    this.cacheService.invalidatePattern('clientes_.*');
    this.cacheService.delete(`cliente_${id}`);
    this.cacheService.delete(`resumo_pagamento_${id}`);
    this.cacheService.invalidatePattern(`pagamentos_cliente_${id}`);
  }

  // Pagamentos
  getPagamentos(): Observable<Pagamento[]> {
    return this.pagamentosSubject.asObservable();
  }

  getPagamentosByCliente(clienteId: string): Pagamento[] {
    return this.pagamentos.filter(p => p.clienteId === clienteId);
  }

  /**
   * Obtém pagamentos por cliente com cache
   */
  getPagamentosByClienteWithCache(clienteId: string): Observable<Pagamento[]> {
    return this.cacheService.get(
      `pagamentos_cliente_${clienteId}`,
      () => of(this.getPagamentosByCliente(clienteId)),
      10 * 60 * 1000 // 10 minutos de cache
    );
  }

  async addPagamento(pagamento: Pagamento): Promise<void> {
    const pagamentoData = {
      ...pagamento,
      dataPagamento: new Date()
    };
    delete (pagamentoData as any).id;
    await addDoc(this.pagamentosCollection, pagamentoData);

    // Invalidar cache relacionado
    this.cacheService.invalidatePattern('pagamentos_.*');
    this.cacheService.delete(`resumo_pagamento_${pagamento.clienteId}`);
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

  /**
   * Obtém resumo de pagamento por cliente com cache
   */
  getResumoPagamentoByClienteWithCache(clienteId: string): Observable<ResumoPagamento | undefined> {
    return this.cacheService.get(
      `resumo_pagamento_${clienteId}`,
      () => of(this.getResumoPagamentoByCliente(clienteId)),
      5 * 60 * 1000 // 5 minutos de cache para resumos
    );
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
        this.logger.service(`onSnapshot executado, docs: ${snapshot.docs.length}`);
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
        this.logger.service(`Emitindo ${this.clientes.length} clientes para subscribers`);
        this.clientesSubject.next([...this.clientes]);

        // Cache dados para uso offline
        this.offlineDataService.cacheData(this.clientes, []);
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

        // Atualizar cache com dados de pagamentos
        this.offlineDataService.cacheData(this.clientes, this.pagamentos);
      },
      (error) => {
        console.error('Erro ao carregar pagamentos:', error);
      }
    );
  }
}
