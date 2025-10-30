import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionSnapshots, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { Cliente, Pagamento, ResumoPagamento } from '../models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private firestore = inject(Firestore);
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
    const clienteData = {
      ...cliente,
      dataCadastro: new Date(),
      compra: {
        ...cliente.compra,
        dataCompra: new Date()
      }
    };
    delete (clienteData as any).id;
    const docRef = await addDoc(this.clientesCollection, clienteData);
    return docRef.id;
  }

  async updateCliente(cliente: Cliente): Promise<void> {
    const clienteDoc = doc(this.firestore, `clientes/${cliente.id}`);
    const clienteData = { ...cliente };
    delete (clienteData as any).id;
    await updateDoc(clienteDoc, clienteData);
  }

  async deleteCliente(id: string): Promise<void> {
    const clienteDoc = doc(this.firestore, `clientes/${id}`);
    await deleteDoc(clienteDoc);
    
    // Deletar pagamentos relacionados
    const pagamentosQuery = query(this.pagamentosCollection, where('clienteId', '==', id));
    const snapshot = await getDocs(pagamentosQuery);
    snapshot.forEach(async (docSnapshot) => {
      await deleteDoc(docSnapshot.ref);
    });
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
      const pagamentosCliente = this.getPagamentosByCliente(cliente.id);
      const totalPago = pagamentosCliente.reduce((sum, p) => sum + p.valorPago, 0);
      const saldoDevedor = cliente.compra.valorTotal - totalPago;

      return {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        valorCompra: cliente.compra.valorTotal,
        numeroParcelas: cliente.compra.numeroParcelas,
        valorParcela: cliente.compra.valorParcela,
        totalPago: totalPago,
        saldoDevedor: saldoDevedor,
        pagamentos: pagamentosCliente
      };
    });
  }

  getResumoPagamentoByCliente(clienteId: string): ResumoPagamento | undefined {
    const cliente = this.getClienteById(clienteId);
    if (!cliente) return undefined;

    const pagamentosCliente = this.getPagamentosByCliente(clienteId);
    const totalPago = pagamentosCliente.reduce((sum, p) => sum + p.valorPago, 0);
    const saldoDevedor = cliente.compra.valorTotal - totalPago;

    return {
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      valorCompra: cliente.compra.valorTotal,
      numeroParcelas: cliente.compra.numeroParcelas,
      valorParcela: cliente.compra.valorParcela,
      totalPago: totalPago,
      saldoDevedor: saldoDevedor,
      pagamentos: pagamentosCliente
    };
  }

  // Utilitários
  private gerarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }


  private carregarDados(): void {
    // Carregar clientes do Firestore usando onSnapshot
    onSnapshot(this.clientesCollection, 
      (snapshot) => {
        this.clientes = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            dataCadastro: data.dataCadastro?.toDate ? data.dataCadastro.toDate() : new Date(data.dataCadastro),
            compra: {
              ...data.compra,
              dataCompra: data.compra?.dataCompra?.toDate ? data.compra.dataCompra.toDate() : new Date(data.compra?.dataCompra || new Date())
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
