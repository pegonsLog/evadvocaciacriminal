import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot, getDoc } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { Parcela, Cliente } from '../models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class ParcelaService {
  private firestore = inject(Firestore);
  private parcelasCollection = collection(this.firestore, 'parcelas');

  private parcelas: Parcela[] = [];
  private parcelasSubject = new BehaviorSubject<Parcela[]>([]);

  private listenersInitialized = false;

  constructor() {
    if (!this.listenersInitialized) {
      this.carregarParcelas();
      this.listenersInitialized = true;
    }
  }

  private carregarParcelas(): void {
    onSnapshot(this.parcelasCollection,
      (snapshot) => {
        this.parcelas = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            dataVencimento: data.dataVencimento?.toDate ? data.dataVencimento.toDate() : new Date(data.dataVencimento),
            dataPagamento: data.dataPagamento ? (data.dataPagamento?.toDate ? data.dataPagamento.toDate() : new Date(data.dataPagamento)) : undefined
          } as Parcela;
        });
        this.parcelasSubject.next([...this.parcelas]);
      },
      (error) => {
        console.error('Erro ao carregar parcelas:', error);
      }
    );
  }

  getParcelas(): Observable<Parcela[]> {
    return this.parcelasSubject.asObservable();
  }

  getParcelasByCliente(clienteId: string): Parcela[] {
    return this.parcelas.filter(p => p.clienteId === clienteId);
  }

  getParcelaById(id: string): Parcela | undefined {
    return this.parcelas.find(p => p.id === id);
  }

  async gerarParcelas(cliente: Cliente): Promise<void> {
    // Verificar se deve usar o novo método com data base ou o método legado
    if (cliente.contrato.dataPrimeiroVencimento) {
      return this.gerarParcelasComDataBase(cliente);
    } else {
      return this.gerarParcelasLegado(cliente);
    }
  }

  /**
   * Novo método que gera parcelas baseado na data do primeiro vencimento
   */
  async gerarParcelasComDataBase(cliente: Cliente): Promise<void> {
    // Validações de negócio
    this.validarDadosCliente(cliente);

    // Primeiro, limpar parcelas existentes para evitar duplicatas
    await this.deleteParcelasByCliente(cliente.id);

    const dataPrimeiroVencimento = this.criarDataSegura(cliente.contrato.dataPrimeiroVencimento);
    const diaVencimento = dataPrimeiroVencimento.getDate();

    // Calcular valor parcelado (total - entrada)
    const valorParcelado = cliente.contrato.valorTotal - cliente.contrato.valorEntrada;
    const valorParcela = valorParcelado / cliente.contrato.numeroParcelas;

    for (let i = 0; i < cliente.contrato.numeroParcelas; i++) {
      // Calcular data de vencimento para cada parcela
      const dataVencimento = new Date(dataPrimeiroVencimento);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);

      // Ajustar para o último dia do mês se o dia não existir
      const ultimoDiaDoMes = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth() + 1, 0).getDate();
      if (diaVencimento > ultimoDiaDoMes) {
        dataVencimento.setDate(ultimoDiaDoMes);
      } else {
        dataVencimento.setDate(diaVencimento);
      }

      const parcela: Omit<Parcela, 'id'> = {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        numeroContrato: cliente.contrato.numeroContrato,
        numeroParcela: i + 1,
        valorParcela: valorParcela,
        dataVencimento: dataVencimento,
        diasAtraso: 0,
        status: 'pendente'
      };

      try {
        await addDoc(this.parcelasCollection, parcela);
        // Pequeno delay para evitar sobrecarga no Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erro ao criar parcela ${i + 1}:`, error);
        throw error; // Re-throw para interromper o processo se houver erro
      }
    }
  }

  /**
   * Método legado para compatibilidade com dados antigos
   */
  private async gerarParcelasLegado(cliente: Cliente): Promise<void> {
    // Primeiro, limpar parcelas existentes para evitar duplicatas
    await this.deleteParcelasByCliente(cliente.id);

    const dataInicio = new Date(cliente.contrato.dataContrato);
    const diaVencimento = (cliente.contrato as any).diaVencimento || 10; // Fallback para dia 10

    for (let i = 1; i <= cliente.contrato.numeroParcelas; i++) {
      // Criar data base para o mês correto
      const dataVencimento = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + i, 1);

      // Definir o dia de vencimento, ajustando para o último dia do mês se necessário
      const ultimoDiaDoMes = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth() + 1, 0).getDate();
      const diaFinal = Math.min(diaVencimento, ultimoDiaDoMes);
      dataVencimento.setDate(diaFinal);

      const parcela: Omit<Parcela, 'id'> = {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        numeroContrato: cliente.contrato.numeroContrato,
        numeroParcela: i,
        valorParcela: cliente.contrato.valorParcela,
        dataVencimento: dataVencimento,
        diasAtraso: 0,
        status: 'pendente'
      };

      try {
        await addDoc(this.parcelasCollection, parcela);
        // Pequeno delay para evitar sobrecarga no Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erro ao criar parcela ${i}:`, error);
        throw error; // Re-throw para interromper o processo se houver erro
      }
    }
  }

  /**
   * Cria uma data de forma segura, evitando problemas de fuso horário
   */
  private criarDataSegura(data: Date | string): Date {
    if (data instanceof Date) {
      return new Date(data);
    }

    // Se for string, adicionar horário para evitar problemas de fuso horário
    if (typeof data === 'string') {
      // Se já tem horário, usar como está
      if (data.includes('T')) {
        return new Date(data);
      }
      // Se não tem horário, adicionar meio-dia para evitar problemas de fuso horário
      return new Date(data + 'T12:00:00');
    }

    return new Date(data);
  }

  /**
   * Validações de negócio para os dados do cliente
   */
  private validarDadosCliente(cliente: Cliente): void {
    // Validar que valor de entrada não seja maior que valor total
    if (cliente.contrato.valorEntrada > cliente.contrato.valorTotal) {
      throw new Error('O valor de entrada não pode ser maior que o valor total do contrato');
    }

    // Validar que o número de parcelas seja válido
    if (cliente.contrato.numeroParcelas <= 0) {
      throw new Error('O número de parcelas deve ser maior que zero');
    }

    // Validar que há valor a ser parcelado
    const valorParcelado = cliente.contrato.valorTotal - cliente.contrato.valorEntrada;
    if (valorParcelado <= 0) {
      throw new Error('Não há valor a ser parcelado (valor total deve ser maior que a entrada)');
    }
  }

  async registrarPagamento(parcelaId: string, valorPago: number, dataPagamento: Date, observacao?: string): Promise<void> {
    try {
      const parcelaDoc = doc(this.firestore, `parcelas/${parcelaId}`);
      const parcela = this.getParcelaById(parcelaId);

      if (parcela) {
        const diasAtraso = this.calcularDiasAtraso(parcela.dataVencimento, dataPagamento);

        const dadosPagamento = {
          dataPagamento: dataPagamento,
          valorPago: valorPago,
          diasAtraso: diasAtraso,
          status: 'pago',
          observacao: observacao || ''
        };

        await updateDoc(parcelaDoc, dadosPagamento);

      } else {
        throw new Error('Parcela não encontrada');
      }
    } catch (error) {
      console.error('💥 [SERVIÇO] Erro ao registrar pagamento:', error);
      throw error;
    }
  }

  async editarDataPagamento(parcelaId: string, novaDataPagamento: Date): Promise<void> {
    const parcelaDoc = doc(this.firestore, `parcelas/${parcelaId}`);
    const parcela = this.getParcelaById(parcelaId);

    if (parcela && parcela.status === 'pago') {
      const diasAtraso = this.calcularDiasAtraso(parcela.dataVencimento, novaDataPagamento);

      await updateDoc(parcelaDoc, {
        dataPagamento: novaDataPagamento,
        diasAtraso: diasAtraso
      });
    }
  }

  async limparDataPagamento(parcelaId: string): Promise<void> {
    const parcelaDoc = doc(this.firestore, `parcelas/${parcelaId}`);
    const parcela = this.getParcelaById(parcelaId);

    if (parcela) {
      await updateDoc(parcelaDoc, {
        dataPagamento: null,
        valorPago: null,
        diasAtraso: 0,
        status: 'pendente',
        observacao: ''
      });

      // Marcar como recentemente limpa para evitar que atualizarStatusParcelas interfira
      this.parcelasRecentementeLimpas.add(parcelaId);

      // Remover da lista após 5 segundos
      setTimeout(() => {
        this.parcelasRecentementeLimpas.delete(parcelaId);
      }, 5000);
    }
  }

  private parcelasRecentementeLimpas = new Set<string>();

  async atualizarStatusParcelas(): Promise<void> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Processar parcelas sequencialmente para evitar sobrecarga no Firebase
    for (const parcela of this.parcelas) {
      // Não atualizar parcelas que foram recentemente limpas
      if (this.parcelasRecentementeLimpas.has(parcela.id)) {
        continue;
      }

      if (parcela.status === 'pendente') {
        const diasAtraso = this.calcularDiasAtraso(parcela.dataVencimento, hoje);
        const novoStatus = diasAtraso > 0 ? 'atrasado' : 'pendente';

        if (parcela.status !== novoStatus || parcela.diasAtraso !== diasAtraso) {
          try {
            const parcelaDoc = doc(this.firestore, `parcelas/${parcela.id}`);
            await updateDoc(parcelaDoc, {
              diasAtraso: diasAtraso,
              status: novoStatus
            });

            // Pequeno delay para evitar sobrecarga
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Erro ao atualizar parcela ${parcela.id}:`, error);
            // Continuar com as outras parcelas mesmo se uma falhar
          }
        }
      }
    }
  }

  private calcularDiasAtraso(dataVencimento: Date, dataReferencia: Date): number {
    const vencimento = new Date(dataVencimento);
    const referencia = new Date(dataReferencia);

    vencimento.setHours(0, 0, 0, 0);
    referencia.setHours(0, 0, 0, 0);

    const diffTime = referencia.getTime() - vencimento.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }

  async deleteParcela(id: string): Promise<void> {
    const parcelaDoc = doc(this.firestore, `parcelas/${id}`);
    await deleteDoc(parcelaDoc);
  }

  async deleteParcelasByCliente(clienteId: string): Promise<void> {
    const parcelasQuery = query(this.parcelasCollection, where('clienteId', '==', clienteId));
    const snapshot = await getDocs(parcelasQuery);

    // Processar deletions sequencialmente para evitar sobrecarga
    for (const docSnapshot of snapshot.docs) {
      try {
        await deleteDoc(docSnapshot.ref);
        // Pequeno delay para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Erro ao deletar parcela ${docSnapshot.id}:`, error);
      }
    }
  }

  /**
   * Recalcula parcelas preservando histórico de pagamentos já realizados
   */
  async recalcularParcelas(cliente: Cliente): Promise<void> {
    // Obter parcelas existentes
    const parcelasExistentes = this.getParcelasByCliente(cliente.id);

    // Separar parcelas pagas das pendentes
    const parcelasPagas = parcelasExistentes.filter(p => p.status === 'pago');
    const parcelasPendentes = parcelasExistentes.filter(p => p.status !== 'pago');

    // Deletar apenas parcelas pendentes
    for (const parcela of parcelasPendentes) {
      await this.deleteParcela(parcela.id);
    }

    // Calcular quantas parcelas ainda precisam ser geradas
    const parcelasRestantes = cliente.contrato.numeroParcelas - parcelasPagas.length;

    if (parcelasRestantes > 0) {
      // Determinar a data de início para as novas parcelas
      let dataInicio: Date;

      if (parcelasPagas.length > 0) {
        // Se há parcelas pagas, começar após a última parcela paga
        const ultimaParcelaPaga = parcelasPagas.sort((a, b) => a.numeroParcela - b.numeroParcela).pop();
        dataInicio = this.criarDataSegura(cliente.contrato.dataPrimeiroVencimento);
        dataInicio.setMonth(dataInicio.getMonth() + ultimaParcelaPaga!.numeroParcela);
      } else {
        // Se não há parcelas pagas, usar a data do primeiro vencimento
        dataInicio = this.criarDataSegura(cliente.contrato.dataPrimeiroVencimento);
      }

      // Gerar novas parcelas
      await this.gerarParcelasRestantes(cliente, parcelasPagas.length, parcelasRestantes, dataInicio);
    }


  }

  /**
   * Gera parcelas restantes após recálculo
   */
  private async gerarParcelasRestantes(
    cliente: Cliente,
    parcelasJaPagas: number,
    parcelasRestantes: number,
    dataInicio: Date
  ): Promise<void> {
    const diaVencimento = dataInicio.getDate();

    // Calcular valor parcelado (total - entrada)
    const valorParcelado = cliente.contrato.valorTotal - cliente.contrato.valorEntrada;
    const valorParcela = valorParcelado / cliente.contrato.numeroParcelas;

    for (let i = 0; i < parcelasRestantes; i++) {
      // Calcular data de vencimento para cada parcela restante
      const dataVencimento = new Date(dataInicio);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);

      // Ajustar para o último dia do mês se o dia não existir
      const ultimoDiaDoMes = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth() + 1, 0).getDate();
      if (diaVencimento > ultimoDiaDoMes) {
        dataVencimento.setDate(ultimoDiaDoMes);
      } else {
        dataVencimento.setDate(diaVencimento);
      }

      const parcela: Omit<Parcela, 'id'> = {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        numeroContrato: cliente.contrato.numeroContrato,
        numeroParcela: parcelasJaPagas + i + 1,
        valorParcela: valorParcela,
        dataVencimento: dataVencimento,
        diasAtraso: 0,
        status: 'pendente'
      };

      try {
        await addDoc(this.parcelasCollection, parcela);
        // Pequeno delay para evitar sobrecarga no Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erro ao criar parcela restante ${parcelasJaPagas + i + 1}:`, error);
        throw error; // Re-throw para interromper o processo se houver erro
      }
    }
  }
}
