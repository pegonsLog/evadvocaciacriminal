import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClienteService } from '../../services/cliente.service';
import { ParcelaService } from '../../services/parcela.service';
import { Cliente, Parcela } from '../../models/cliente.model';

interface ResumoCliente {
  totalPago: number;
  saldoDevedor: number;
  parcelasPagas: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  parcelas: Parcela[] = [];
  resumos: Map<string, ResumoCliente> = new Map();
  filtroNome: string = '';

  constructor(
    private clienteService: ClienteService,
    private parcelaService: ParcelaService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.clienteService.getClientes().subscribe(clientes => {
      this.clientes = clientes;
      this.aplicarFiltro();
    });

    this.parcelaService.getParcelas().subscribe(parcelas => {
      this.parcelas = parcelas;
      this.calcularResumos();
    });
  }

  aplicarFiltro(): void {
    if (!this.filtroNome.trim()) {
      this.clientesFiltrados = this.clientes;
    } else {
      const filtro = this.filtroNome.toLowerCase().trim();
      this.clientesFiltrados = this.clientes.filter(cliente =>
        cliente.nome.toLowerCase().includes(filtro)
      );
    }
  }

  calcularResumos(): void {
    this.clientes.forEach(cliente => {
      const parcelasCliente = this.parcelas.filter(p => p.clienteId === cliente.id);

      const totalPago = parcelasCliente
        .filter(p => p.status === 'pago')
        .reduce((total, p) => total + (p.valorPago || 0), 0);

      const parcelasPagas = parcelasCliente.filter(p => p.status === 'pago').length;
      // Saldo devedor = (Valor total - Entrada) - Total pago
      const valorParcelado = cliente.contrato.valorTotal - cliente.contrato.valorEntrada;
      const saldoDevedor = valorParcelado - totalPago;

      this.resumos.set(cliente.id, {
        totalPago,
        saldoDevedor,
        parcelasPagas
      });
    });
  }

  getResumo(clienteId: string): ResumoCliente {
    return this.resumos.get(clienteId) || { totalPago: 0, saldoDevedor: 0, parcelasPagas: 0 };
  }

  getTotalRecebido(): number {
    return Array.from(this.resumos.values())
      .reduce((total, resumo) => total + resumo.totalPago, 0);
  }

  getTotalPendente(): number {
    return Array.from(this.resumos.values())
      .reduce((total, resumo) => total + resumo.saldoDevedor, 0);
  }

  getPercentualRecebido(): number {
    const totalRecebido = this.getTotalRecebido();
    const totalGeral = totalRecebido + this.getTotalPendente();
    return totalGeral > 0 ? Math.round((totalRecebido / totalGeral) * 100) : 0;
  }

  getStatusClass(clienteId: string): string {
    const resumo = this.getResumo(clienteId);
    const cliente = this.clientes.find(c => c.id === clienteId);
    if (!cliente) return 'status-neutral';

    const percentualPago = (resumo.parcelasPagas / cliente.contrato.numeroParcelas) * 100;

    if (percentualPago === 100) return 'status-success';
    if (percentualPago >= 50) return 'status-warning';
    return 'status-danger';
  }

  getStatusIcon(clienteId: string): string {
    const resumo = this.getResumo(clienteId);
    const cliente = this.clientes.find(c => c.id === clienteId);
    if (!cliente) return 'bi-circle';

    const percentualPago = (resumo.parcelasPagas / cliente.contrato.numeroParcelas) * 100;

    if (percentualPago === 100) return 'bi-check-circle-fill';
    if (percentualPago >= 50) return 'bi-clock-fill';
    return 'bi-exclamation-circle-fill';
  }

  trackByClienteId(index: number, cliente: Cliente): string {
    return cliente.id;
  }

  verDetalhes(clienteId: string): void {
    this.router.navigate(['/clientes', clienteId]);
  }

  novoCliente(): void {
    this.router.navigate(['/clientes/novo']);
  }
}
