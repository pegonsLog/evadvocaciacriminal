import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ParcelaService } from '../../../services/parcela.service';
import { ClienteService } from '../../../services/cliente.service';
import { Parcela, Cliente } from '../../../models/cliente.model';
import { ModalService } from '../../../services/modal.service';

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
    private router: Router,
    private modalService: ModalService
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
    
    // Atualizar status das parcelas após carregar (com delay para não interferir em operações recentes)
    setTimeout(() => {
      this.parcelaService.atualizarStatusParcelas();
    }, 1000);
  }

  parcelaEditando?: Parcela;
  dataPagamentoInput: string = '';
  valorPagoInput: string = '';
  observacaoInput: string = '';

  abrirModalPagamento(parcela: Parcela): void {
    this.parcelaEditando = parcela;
    // Converter data atual para formato local sem problemas de fuso horário
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    this.dataPagamentoInput = `${ano}-${mes}-${dia}`;
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
      this.modalService.showWarning('Preencha a data do pagamento!');
      return;
    }

    // Criar data no meio-dia para evitar problemas de fuso horário
    const [ano, mes, dia] = this.dataPagamentoInput.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
    const valor = parseFloat(this.valorPagoInput) || this.parcelaEditando.valorParcela;

    try {
      await this.parcelaService.registrarPagamento(
        this.parcelaEditando.id,
        valor,
        data,
        this.observacaoInput
      );
      this.modalService.showSuccess('Pagamento registrado com sucesso!', 'Sucesso', () => {
        this.cancelarPagamento();
      });
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      this.modalService.showError('Erro ao registrar pagamento.');
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
      default: return 'Em Aberto';
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

  editarParcela(parcela: Parcela): void {
    // Redirecionar para a página de pagamentos onde há mais opções de edição
    this.router.navigate(['/pagamentos', this.clienteId]);
  }
}
