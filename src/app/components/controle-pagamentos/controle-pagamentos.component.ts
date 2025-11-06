import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ClienteService } from '../../services/cliente.service';
import { ParcelaService } from '../../services/parcela.service';
import { ResumoPagamento } from '../../models/cliente.model';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-controle-pagamentos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './controle-pagamentos.component.html',
  styleUrl: './controle-pagamentos.component.scss'
})
export class ControlePagamentosComponent implements OnInit, OnDestroy {
  resumos: ResumoPagamento[] = [];
  totalGeralCompras = 0;
  totalGeralPago = 0;
  totalGeralDevedor = 0;
  totalGeralEntradas = 0;

  private subscription?: Subscription;

  constructor(
    private clienteService: ClienteService,
    private parcelaService: ParcelaService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Observa mudanças em clientes, pagamentos e parcelas
    this.subscription = combineLatest([
      this.clienteService.getClientes(),
      this.clienteService.getPagamentos(),
      this.parcelaService.getParcelas()
    ]).subscribe({
      next: () => {
        this.carregarResumos();
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  carregarResumos(): void {
    this.resumos = this.clienteService.getResumoPagamentos();
    this.calcularTotais();
  }

  calcularTotais(): void {
    this.totalGeralCompras = this.resumos.reduce((sum, r) => sum + r.valorCompra, 0);
    this.totalGeralPago = this.resumos.reduce((sum, r) => sum + r.totalPago, 0);
    this.totalGeralDevedor = this.resumos.reduce((sum, r) => sum + r.saldoDevedor, 0);
    
    // Calcular total de entradas - usar os dados já disponíveis nos resumos
    // Para isso, precisamos acessar os clientes através do serviço
    this.calcularTotalEntradas();
  }

  private calcularTotalEntradas(): void {
    this.totalGeralEntradas = 0;
    
    // Iterar pelos resumos e buscar o valor de entrada de cada cliente
    this.resumos.forEach(resumo => {
      const cliente = this.clienteService.getClienteById(resumo.clienteId);
      if (cliente) {
        this.totalGeralEntradas += cliente.contrato.valorEntrada;
      }
    });
  }

  trackByClienteId(index: number, resumo: ResumoPagamento): string {
    return resumo.clienteId;
  }

  verDetalhes(clienteId: string): void {
    this.router.navigate(['/clientes', clienteId]);
  }

  verPagamentos(clienteId: string): void {
    this.router.navigate(['/pagamentos', clienteId]);
  }
}
