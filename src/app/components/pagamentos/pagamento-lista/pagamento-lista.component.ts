import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';
import { ParcelaService } from '../../../services/parcela.service';
import { Cliente, Parcela } from '../../../models/cliente.model';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-pagamento-lista',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pagamento-lista.component.html',
  styleUrl: './pagamento-lista.component.scss'
})
export class PagamentoListaComponent implements OnInit {
  cliente?: Cliente;
  parcelas: Parcela[] = [];
  parcelaEditando?: Parcela;
  dataPagamentoInput: string = '';
  valorPagoInput: string = '';
  observacaoInput: string = '';
  editandoData: boolean = false;

  constructor(
    private clienteService: ClienteService,
    private parcelaService: ParcelaService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cliente = this.clienteService.getClienteById(id);
      this.carregarParcelas(id);
    }
  }

  carregarParcelas(clienteId: string): void {
    this.parcelaService.getParcelas().subscribe(parcelas => {
      this.parcelas = parcelas
        .filter(p => p.clienteId === clienteId)
        .sort((a, b) => a.numeroParcela - b.numeroParcela);
    });

    // Atualizar status das parcelas após carregar (com delay para não interferir em operações recentes)
    setTimeout(() => {
      this.parcelaService.atualizarStatusParcelas();
    }, 1000);
  }

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
    console.log('💰 Iniciando confirmação de pagamento');
    console.log('📝 Dados do formulário:', {
      parcelaEditando: this.parcelaEditando?.id,
      dataPagamentoInput: this.dataPagamentoInput,
      valorPagoInput: this.valorPagoInput,
      observacaoInput: this.observacaoInput
    });

    if (!this.parcelaEditando || !this.dataPagamentoInput) {
      console.log('❌ Validação falhou - dados obrigatórios não preenchidos');
      this.modalService.showWarning('Preencha a data do pagamento!');
      return;
    }

    // Criar data no meio-dia para evitar problemas de fuso horário
    const [ano, mes, dia] = this.dataPagamentoInput.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
    const valor = parseFloat(this.valorPagoInput) || this.parcelaEditando.valorParcela;

    console.log('📊 Dados processados:', {
      data: data,
      valor: valor,
      parcelaId: this.parcelaEditando.id
    });

    try {
      console.log('🚀 Chamando registrarPagamento...');
      await this.parcelaService.registrarPagamento(
        this.parcelaEditando.id,
        valor,
        data,
        this.observacaoInput
      );
      console.log('✅ Pagamento registrado, mostrando modal de sucesso');
      this.modalService.showSuccess('Pagamento registrado com sucesso!', 'Sucesso', () => {
        this.cancelarPagamento();
      });
    } catch (error) {
      console.error('💥 Erro ao registrar pagamento:', error);
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

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pago': return 'bi-check-circle-fill';
      case 'atrasado': return 'bi-exclamation-triangle-fill';
      default: return 'bi-clock-fill';
    }
  }

  calcularTotalPago(): number {
    return this.parcelas
      .filter(p => p.status === 'pago')
      .reduce((total, p) => total + (p.valorPago || 0), 0);
  }

  contarPorStatus(status: string): number {
    return this.parcelas.filter(p => p.status === status).length;
  }

  editarDataPagamento(parcela: Parcela): void {
    this.parcelaEditando = parcela;
    this.editandoData = true;
  }

  cancelarEdicaoData(): void {
    this.parcelaEditando = undefined;
    this.editandoData = false;
  }

  async limparDataPagamento(): Promise<void> {
    if (!this.parcelaEditando) {
      return;
    }

    const confirmado = await this.modalService.showConfirm(
      `Tem certeza que deseja limpar a data de pagamento da parcela ${this.parcelaEditando.numeroParcela}?<br><br>` +
      'Esta ação irá:<br>' +
      '• Remover a data de pagamento<br>' +
      '• Alterar o status para "Em Aberto"<br>' +
      '• Recalcular os dias de atraso',
      'Confirmar Limpeza'
    );

    if (confirmado) {
      console.log('🚀 Callback de confirmação executado');
      console.log('📝 Parcela sendo editada:', {
        id: this.parcelaEditando?.id,
        status: this.parcelaEditando?.status,
        dataPagamento: this.parcelaEditando?.dataPagamento
      });

      try {
        await this.parcelaService.limparDataPagamento(this.parcelaEditando!.id);
        console.log('🎉 Serviço executado, mostrando modal de sucesso');
        this.modalService.showSuccess('Data de pagamento removida com sucesso! A parcela voltou ao status em aberto.', 'Sucesso', () => {
          console.log('🔄 Callback de sucesso executado, cancelando edição');
          this.cancelarEdicaoData();
        });
      } catch (error) {
        console.error('❌ Erro ao limpar data de pagamento:', error);
        this.modalService.showError('Erro ao limpar data de pagamento.');
      }
    }
  }

  voltar(): void {
    this.router.navigate(['/clientes']);
  }

  getDiaVencimento(): number {
    if (this.cliente?.contrato.dataPrimeiroVencimento) {
      return this.criarDataSegura(this.cliente.contrato.dataPrimeiroVencimento).getDate();
    }
    return 10; // Valor padrão para compatibilidade
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
