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
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cliente = this.clienteService.getClienteById(id);
      this.carregarResumo(id);
    }
  }

  carregarResumo(clienteId: string): void {
    this.parcelaService.getParcelas().subscribe(parcelas => {
      this.parcelas = parcelas.filter(p => p.clienteId === clienteId);
      this.calcularResumo();
    });
  }

  calcularResumo(): void {
    this.totalPago = this.parcelas
      .filter(p => p.status === 'pago')
      .reduce((total, p) => total + (p.valorPago || 0), 0);
    
    this.parcelasPagas = this.parcelas.filter(p => p.status === 'pago').length;
    
    if (this.cliente) {
      this.saldoDevedor = this.cliente.compra.valorTotal - this.totalPago;
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
}
