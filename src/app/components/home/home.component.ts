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
  ) {}

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
      const saldoDevedor = cliente.compra.valorTotal - totalPago;

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

  verDetalhes(clienteId: string): void {
    this.router.navigate(['/clientes', clienteId]);
  }

  novoCliente(): void {
    this.router.navigate(['/clientes/novo']);
  }
}
