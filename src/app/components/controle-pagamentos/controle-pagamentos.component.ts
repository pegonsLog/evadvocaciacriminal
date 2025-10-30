import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ClienteService } from '../../services/cliente.service';
import { ResumoPagamento } from '../../models/cliente.model';

@Component({
  selector: 'app-controle-pagamentos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './controle-pagamentos.component.html',
  styleUrl: './controle-pagamentos.component.scss'
})
export class ControlePagamentosComponent implements OnInit {
  resumos: ResumoPagamento[] = [];
  totalGeralCompras = 0;
  totalGeralPago = 0;
  totalGeralDevedor = 0;

  constructor(
    private clienteService: ClienteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarResumos();
  }

  carregarResumos(): void {
    this.resumos = this.clienteService.getResumoPagamentos();
    this.calcularTotais();
  }

  calcularTotais(): void {
    this.totalGeralCompras = this.resumos.reduce((sum, r) => sum + r.valorCompra, 0);
    this.totalGeralPago = this.resumos.reduce((sum, r) => sum + r.totalPago, 0);
    this.totalGeralDevedor = this.resumos.reduce((sum, r) => sum + r.saldoDevedor, 0);
  }

  verDetalhes(clienteId: string): void {
    this.router.navigate(['/clientes', clienteId]);
  }

  verPagamentos(clienteId: string): void {
    this.router.navigate(['/pagamentos', clienteId]);
  }
}
