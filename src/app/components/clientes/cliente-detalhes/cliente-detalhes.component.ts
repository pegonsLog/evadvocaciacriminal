import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';
import { ParcelaService } from '../../../services/parcela.service';
import { Cliente, Parcela } from '../../../models/cliente.model';

@Component({
  selector: 'app-cliente-detalhes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cliente-detalhes.component.html',
  styleUrl: './cliente-detalhes.component.scss'
})
export class ClienteDetalhesComponent implements OnInit {
  cliente?: Cliente;
  parcelas: Parcela[] = [];
  totalPago: number = 0;
  saldoDevedor: number = 0;
  parcelasPagas: number = 0;

  constructor(
    private clienteService: ClienteService,
    private parcelaService: ParcelaService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Aguardar os dados serem carregados do Firestore
      this.clienteService.getClientes().subscribe(clientes => {
        this.cliente = clientes.find(c => c.id === id);
        if (this.cliente) {
          this.carregarResumo(id);
        }
      });
    }
  }

  carregarResumo(clienteId: string): void {
    this.parcelaService.getParcelas().subscribe(parcelas => {
      this.parcelas = parcelas.filter(p => p.clienteId === clienteId);
      this.calcularResumo();
    });
  }

  calcularResumo(): void {
    // Filtrar apenas parcelas pagas
    const parcelasPagas = this.parcelas.filter(p => p.status === 'pago');

    this.totalPago = parcelasPagas.reduce((total, p) => total + (p.valorPago || 0), 0);
    this.parcelasPagas = parcelasPagas.length;

    if (this.cliente) {
      // Saldo devedor = (Valor total - Entrada) - Total pago
      const valorParcelado = this.cliente.contrato.valorTotal - this.cliente.contrato.valorEntrada;
      this.saldoDevedor = valorParcelado - this.totalPago;
    }
  }

  voltar(): void {
    this.router.navigate(['/clientes']);
  }

  editar(): void {
    if (this.cliente) {
      this.router.navigate(['/clientes/editar', this.cliente.id]);
    }
  }

  verPagamentos(): void {
    if (this.cliente) {
      this.router.navigate(['/pagamentos', this.cliente.id]);
    }
  }

  getDiaVencimento(): number {
    if (this.cliente?.contrato.dataPrimeiroVencimento) {
      return this.criarDataSegura(this.cliente.contrato.dataPrimeiroVencimento).getDate();
    }
    // Para clientes antigos, usar dia 10 como padrão
    return 10;
  }

  formatarDataPrimeiroVencimento(): string {
    if (this.cliente?.contrato.dataPrimeiroVencimento) {
      const data = this.criarDataSegura(this.cliente.contrato.dataPrimeiroVencimento);
      return data.toLocaleDateString('pt-BR');
    }
    return '';
  }

  formatarDataContrato(): string {
    if (this.cliente?.contrato.dataContrato) {
      const data = this.criarDataSegura(this.cliente.contrato.dataContrato);
      return data.toLocaleDateString('pt-BR');
    }
    return new Date().toLocaleDateString('pt-BR');
  }

  private criarDataSegura(data: Date | string): Date {
    if (data instanceof Date) {
      return new Date(data);
    }

    if (typeof data === 'string') {
      if (data.includes('T')) {
        return new Date(data);
      }
      return new Date(data + 'T12:00:00');
    }

    return new Date(data);
  }
}
