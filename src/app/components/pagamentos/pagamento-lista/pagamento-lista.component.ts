import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';
import { ParcelaService } from '../../../services/parcela.service';
import { Cliente, Parcela } from '../../../models/cliente.model';

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
  novaDataPagamentoInput: string = '';

  constructor(
    private clienteService: ClienteService,
    private parcelaService: ParcelaService,
    private route: ActivatedRoute,
    private router: Router
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
    if (!this.parcelaEditando || !this.dataPagamentoInput) {
      alert('Preencha a data do pagamento!');
      return;
    }

    // Criar data no fuso horário local para evitar problemas de UTC
    const [ano, mes, dia] = this.dataPagamentoInput.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
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
    if (parcela.dataPagamento) {
      // Converter data para formato local sem problemas de fuso horário
      const data = new Date(parcela.dataPagamento);
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      this.novaDataPagamentoInput = `${ano}-${mes}-${dia}`;
    }
  }

  cancelarEdicaoData(): void {
    this.parcelaEditando = undefined;
    this.editandoData = false;
    this.novaDataPagamentoInput = '';
  }

  async confirmarEdicaoData(): Promise<void> {
    if (!this.parcelaEditando || !this.novaDataPagamentoInput) {
      alert('Preencha a nova data do pagamento!');
      return;
    }

    // Criar data no fuso horário local para evitar problemas de UTC
    const [ano, mes, dia] = this.novaDataPagamentoInput.split('-').map(Number);
    const novaData = new Date(ano, mes - 1, dia);

    try {
      await this.parcelaService.editarDataPagamento(
        this.parcelaEditando.id,
        novaData
      );
      alert('Data de pagamento alterada com sucesso!');
      this.cancelarEdicaoData();
    } catch (error) {
      console.error('Erro ao alterar data de pagamento:', error);
      alert('Erro ao alterar data de pagamento.');
    }
  }

  async limparDataPagamento(): Promise<void> {
    if (!this.parcelaEditando) {
      return;
    }

    const confirmacao = confirm(
      `Tem certeza que deseja limpar a data de pagamento da parcela ${this.parcelaEditando.numeroParcela}?\n\n` +
      'Esta ação irá:\n' +
      '• Remover a data de pagamento\n' +
      '• Alterar o status para "Pendente"\n' +
      '• Recalcular os dias de atraso'
    );

    if (!confirmacao) {
      return;
    }

    try {
      await this.parcelaService.limparDataPagamento(this.parcelaEditando.id);
      alert('Data de pagamento removida com sucesso! A parcela voltou ao status pendente.');
      this.cancelarEdicaoData();
    } catch (error) {
      console.error('Erro ao limpar data de pagamento:', error);
      alert('Erro ao limpar data de pagamento.');
    }
  }

  voltar(): void {
    this.router.navigate(['/clientes']);
  }
}
