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

  constructor() {
    this.carregarParcelas();
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
    // Primeiro, limpar parcelas existentes para evitar duplicatas
    await this.deleteParcelasByCliente(cliente.id);
    
    const dataInicio = new Date(cliente.compra.dataCompra);
    const diaVencimento = cliente.compra.diaVencimento;

    for (let i = 1; i <= cliente.compra.numeroParcelas; i++) {
      // Criar data base para o mês correto
      const dataVencimento = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + i, 1);
      
      // Definir o dia de vencimento, ajustando para o último dia do mês se necessário
      const ultimoDiaDoMes = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth() + 1, 0).getDate();
      const diaFinal = Math.min(diaVencimento, ultimoDiaDoMes);
      dataVencimento.setDate(diaFinal);

      const parcela: Omit<Parcela, 'id'> = {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        numeroContrato: cliente.compra.numeroContrato,
        numeroParcela: i,
        valorParcela: cliente.compra.valorParcela,
        dataVencimento: dataVencimento,
        diasAtraso: 0,
        status: 'pendente'
      };

      await addDoc(this.parcelasCollection, parcela);
    }
  }

  async registrarPagamento(parcelaId: string, valorPago: number, dataPagamento: Date, observacao?: string): Promise<void> {
    console.log('💰 [SERVIÇO] Iniciando registro de pagamento');
    console.log('💰 [SERVIÇO] Parâmetros recebidos:', {
      parcelaId,
      valorPago,
      dataPagamento,
      observacao
    });

    try {
      const parcelaDoc = doc(this.firestore, `parcelas/${parcelaId}`);
      const parcela = this.getParcelaById(parcelaId);

      console.log('📋 [SERVIÇO] Parcela encontrada:', {
        id: parcela?.id,
        status: parcela?.status,
        valorParcela: parcela?.valorParcela
      });

      if (parcela) {
        const diasAtraso = this.calcularDiasAtraso(parcela.dataVencimento, dataPagamento);
        
        const dadosPagamento = {
          dataPagamento: dataPagamento,
          valorPago: valorPago,
          diasAtraso: diasAtraso,
          status: 'pago',
          observacao: observacao || ''
        };

        console.log('💾 [SERVIÇO] Dados para salvar:', dadosPagamento);
        console.log('🔗 [SERVIÇO] Referência do documento:', parcelaDoc.path);

        await updateDoc(parcelaDoc, dadosPagamento);
        
        console.log('✅ [SERVIÇO] Pagamento registrado com sucesso no Firestore');

        // Verificar se foi salvo
        const docSnapshot = await getDoc(parcelaDoc);
        if (docSnapshot.exists()) {
          console.log('📄 [SERVIÇO] Dados salvos no Firestore:', docSnapshot.data());
        }

      } else {
        console.log('❌ [SERVIÇO] Parcela não encontrada');
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

    this.parcelas.forEach(async (parcela) => {
      // Não atualizar parcelas que foram recentemente limpas
      if (this.parcelasRecentementeLimpas.has(parcela.id)) {
        return;
      }

      if (parcela.status === 'pendente') {
        const diasAtraso = this.calcularDiasAtraso(parcela.dataVencimento, hoje);
        const novoStatus = diasAtraso > 0 ? 'atrasado' : 'pendente';

        if (parcela.status !== novoStatus || parcela.diasAtraso !== diasAtraso) {
          const parcelaDoc = doc(this.firestore, `parcelas/${parcela.id}`);
          await updateDoc(parcelaDoc, {
            diasAtraso: diasAtraso,
            status: novoStatus
          });
        }
      }
    });
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
    snapshot.forEach(async (docSnapshot) => {
      await deleteDoc(docSnapshot.ref);
    });
  }
}
