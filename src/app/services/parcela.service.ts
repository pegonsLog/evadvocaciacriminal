import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot } from '@angular/fire/firestore';
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
    const dataInicio = new Date(cliente.compra.dataCompra);
    const diaVencimento = cliente.compra.diaVencimento;

    for (let i = 1; i <= cliente.compra.numeroParcelas; i++) {
      const dataVencimento = new Date(dataInicio);
      dataVencimento.setMonth(dataInicio.getMonth() + i);
      dataVencimento.setDate(diaVencimento);

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
    const parcelaDoc = doc(this.firestore, `parcelas/${parcelaId}`);
    const parcela = this.getParcelaById(parcelaId);
    
    if (parcela) {
      const diasAtraso = this.calcularDiasAtraso(parcela.dataVencimento, dataPagamento);
      
      await updateDoc(parcelaDoc, {
        dataPagamento: dataPagamento,
        valorPago: valorPago,
        diasAtraso: diasAtraso,
        status: 'pago',
        observacao: observacao || ''
      });
    }
  }

  async atualizarStatusParcelas(): Promise<void> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    this.parcelas.forEach(async (parcela) => {
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
