import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ParcelaService } from '../../../services/parcela.service';
import { ClienteService } from '../../../services/cliente.service';
import { Parcela, Cliente } from '../../../models/cliente.model';

@Component({
  selector: 'app-parcela-lista',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './parcela-lista.component.html',
  styleUrl: './parcela-lista.component.scss'
})
export class ParcelaListaComponent implements OnInit {
  parcelas: Parcela[] = [];
  cliente?: Cliente;
  clienteId!: string;

  constructor(
    private parcelaService: ParcelaService,
    private clienteService: ClienteService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.clienteId = this.route.snapshot.paramMap.get('clienteId') || '';
    if (this.clienteId) {
      this.cliente = this.clienteService.getClienteById(this.clienteId);
      this.carregarParcelas();
    }
  }

  carregarParcelas(): void {
    this.parcelaService.getParcelas().subscribe(parcelas => {
      this.parcelas = parcelas
        .filter(p => p.clienteId === this.clienteId)
        .sort((a, b) => a.numeroParcela - b.numeroParcela);
    });
  }

  parcelaEditando?: Parcela;
  dataPagamentoInput: string = '';
  valorPagoInput: string = '';
  observacaoInput: string = '';

  abrirModalPagamento(parcela: Parcela): void {
    this.parcelaEditando = parcela;
    // Preencher com a data de hoje por padrão
    const hoje = new Date();
    this.dataPagamentoInput = hoje.toISOString().split('T')[0];
    this.valorPagoInput = parcela.valorParcela.toString();
    this.observacaoInput = '';
  }

  cancelarPagamento(): void {
    this.parcelaEditando = undefined;
    this.dataPagamentoInput = '';
    this.valorPagoInput = '';
    this.observacaoInput = '';
  }

  async confirmarPagamento(): Promise<void> {
    if (!this.parcelaEditando || !this.dataPagamentoInput) {
      alert('Preencha a data do pagamento!');
      return;
    }

    const data = new Date(this.dataPagamentoInput);
    const valor = parseFloat(this.valorPagoInput) || this.parcelaEditando.valorParcela;

    try {
      await this.parcelaService.registrarPagamento(
        this.parcelaEditando.id,
        valor,
        data,
        this.observacaoInput
      );
      alert('Pagamento registrado com sucesso!');
      this.cancelarPagamento();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento.');
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pago': return 'success';
      case 'atrasado': return 'danger';
      default: return 'warning';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pago': return 'Pago';
      case 'atrasado': return 'Atrasado';
      default: return 'Pendente';
    }
  }

  voltar(): void {
    this.router.navigate(['/clientes']);
  }

  calcularTotalPago(): number {
    return this.parcelas
      .filter(p => p.status === 'pago')
      .reduce((total, p) => total + (p.valorPago || 0), 0);
  }

  contarPorStatus(status: string): number {
    return this.parcelas.filter(p => p.status === status).length;
  }
}
