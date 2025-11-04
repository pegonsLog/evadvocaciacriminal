import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';
import { ParcelaService } from '../../../services/parcela.service';
import { Cliente } from '../../../models/cliente.model';
import { provideNgxMask, NgxMaskDirective } from 'ngx-mask';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxMaskDirective],
  providers: [provideNgxMask()],
  templateUrl: './cliente-form.component.html',
  styleUrl: './cliente-form.component.scss'
})
export class ClienteFormComponent implements OnInit {
  clienteForm!: FormGroup;
  isEditMode = false;
  clienteId?: string;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private parcelaService: ParcelaService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: ModalService
  ) { }

  // Validador customizado para verificar se a data não é anterior à data atual
  dateNotInPastValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const inputDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Remove horas para comparar apenas a data

    if (inputDate < today) {
      return { dateInPast: true };
    }

    return null;
  }

  // Validador customizado para verificar se entrada não é maior que o total
  entradaMenorQueTotal(control: AbstractControl): ValidationErrors | null {
    if (!control.parent) {
      return null;
    }

    const valorTotal = control.parent.get('valorTotal')?.value;
    const valorEntrada = control.value;

    if (valorTotal && valorEntrada) {
      let total = typeof valorTotal === 'string' ?
        parseFloat(valorTotal.replace(/\./g, '').replace(',', '.')) : valorTotal;
      let entrada = typeof valorEntrada === 'string' ?
        parseFloat(valorEntrada.replace(/\./g, '').replace(',', '.')) : valorEntrada;

      if (entrada > total) {
        return { entradaMaiorQueTotal: true };
      }
    }

    return null;
  }

  ngOnInit(): void {
    this.initForm();

    this.clienteId = this.route.snapshot.paramMap.get('id') || undefined;
    if (this.clienteId) {
      this.isEditMode = true;
      this.carregarCliente(this.clienteId);
    }
  }

  initForm(): void {
    this.clienteForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      cpf: ['', [Validators.required]],
      telefone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      endereco: ['', [Validators.required]],
      numeroContrato: ['', [Validators.required]],
      valorEntrada: ['', [Validators.required, Validators.min(0), this.entradaMenorQueTotal.bind(this)]],
      valorTotal: ['', [Validators.required, Validators.min(0.01)]],
      numeroParcelas: ['', [Validators.required, Validators.min(1)]],
      valorParcela: ['', [Validators.required, Validators.min(0.01)]],
      dataPrimeiroVencimento: ['', [Validators.required, this.dateNotInPastValidator.bind(this)]],
      relatorioContratosPendentes: ['']
    });

    // Calcular valor da parcela automaticamente
    this.clienteForm.get('valorTotal')?.valueChanges.subscribe(() => this.calcularValorParcela());
    this.clienteForm.get('valorEntrada')?.valueChanges.subscribe(() => this.calcularValorParcela());
    this.clienteForm.get('numeroParcelas')?.valueChanges.subscribe(() => this.calcularValorParcela());
  }

  calcularValorParcela(): void {
    let valorTotal = this.clienteForm.get('valorTotal')?.value;
    let valorEntrada = this.clienteForm.get('valorEntrada')?.value;
    let numeroParcelas = this.clienteForm.get('numeroParcelas')?.value;

    // Remove formatação para cálculo
    if (typeof valorTotal === 'string') {
      valorTotal = parseFloat(valorTotal.replace(/\./g, '').replace(',', '.'));
    }
    if (typeof valorEntrada === 'string') {
      valorEntrada = parseFloat(valorEntrada.replace(/\./g, '').replace(',', '.'));
    }
    if (typeof numeroParcelas === 'string') {
      numeroParcelas = parseInt(numeroParcelas);
    }

    // Garantir valores padrão
    valorTotal = valorTotal || 0;
    valorEntrada = valorEntrada || 0;
    numeroParcelas = numeroParcelas || 1;

    if (valorTotal > 0 && numeroParcelas > 0) {
      // Calcular valor parcelado (total - entrada)
      const valorParcelado = valorTotal - valorEntrada;
      const valorParcela = valorParcelado / numeroParcelas;

      this.clienteForm.patchValue({
        valorParcela: this.formatarMoeda(valorParcela)
      }, { emitEvent: false });
    }
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatarDataParaInput(data: Date): string {
    // Garantir que a data seja tratada no fuso horário local
    const dataLocal = this.criarDataSegura(data);
    const ano = dataLocal.getFullYear();
    const mes = (dataLocal.getMonth() + 1).toString().padStart(2, '0');
    const dia = dataLocal.getDate().toString().padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
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


  carregarCliente(id: string): void {
    const cliente = this.clienteService.getClienteById(id);
    if (cliente) {
      this.clienteForm.patchValue({
        nome: cliente.nome,
        cpf: cliente.cpf,
        telefone: cliente.telefone,
        email: cliente.email,
        endereco: cliente.endereco,
        numeroContrato: cliente.contrato.numeroContrato,
        valorEntrada: cliente.contrato.valorEntrada,
        valorTotal: cliente.contrato.valorTotal,
        numeroParcelas: cliente.contrato.numeroParcelas,
        valorParcela: cliente.contrato.valorParcela,
        dataPrimeiroVencimento: cliente.contrato.dataPrimeiroVencimento ?
          this.formatarDataParaInput(cliente.contrato.dataPrimeiroVencimento) : '',
        relatorioContratosPendentes: cliente.contrato.relatorioContratosPendentes
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting) {
      return; // Evita múltiplos submits
    }

    if (this.clienteForm.valid) {
      // Verificar se é edição e se houve mudanças que afetam as parcelas
      if (this.isEditMode && this.clienteId) {
        const clienteAnterior = this.clienteService.getClienteById(this.clienteId);
        if (clienteAnterior && this.verificarMudancasRelevantes(clienteAnterior)) {
          const confirmar = await this.modalService.showConfirm(
            'As alterações realizadas irão recalcular as parcelas pendentes. Parcelas já pagas serão preservadas. Deseja continuar?',
            'Recálculo de Parcelas'
          );

          if (!confirmar) {
            return;
          }
        }
      }

      this.isSubmitting = true;
      const formValue = this.clienteForm.value;

      // Remove formatação dos valores
      let valorEntrada = formValue.valorEntrada;
      let valorTotal = formValue.valorTotal;
      let valorParcela = formValue.valorParcela;

      if (typeof valorEntrada === 'string') {
        valorEntrada = parseFloat(valorEntrada.replace(/\./g, '').replace(',', '.'));
      }
      if (typeof valorTotal === 'string') {
        valorTotal = parseFloat(valorTotal.replace(/\./g, '').replace(',', '.'));
      }
      if (typeof valorParcela === 'string') {
        valorParcela = parseFloat(valorParcela.replace(/\./g, '').replace(',', '.'));
      }

      const cliente: Cliente = {
        id: this.clienteId || '',
        nome: formValue.nome,
        cpf: formValue.cpf,
        telefone: formValue.telefone,
        email: formValue.email,
        endereco: formValue.endereco,
        dataCadastro: new Date(),
        contrato: {
          numeroContrato: formValue.numeroContrato,
          valorEntrada: valorEntrada,
          valorTotal: valorTotal,
          numeroParcelas: parseInt(formValue.numeroParcelas),
          valorParcela: valorParcela,
          dataContrato: new Date(),
          dataPrimeiroVencimento: new Date(formValue.dataPrimeiroVencimento + 'T12:00:00'),
          relatorioContratosPendentes: formValue.relatorioContratosPendentes || ''
        }
      };

      try {
        if (this.isEditMode) {
          await this.clienteService.updateCliente(cliente);
          this.modalService.showSuccess('Cliente atualizado com sucesso!', 'Sucesso', () => {
            this.router.navigate(['/clientes']);
          });
        } else {
          // Adicionar cliente - parcelas serão geradas automaticamente pelo serviço
          const clienteId = await this.clienteService.addCliente(cliente);

          this.modalService.showSuccess(`Cliente cadastrado com sucesso! ${cliente.contrato.numeroParcelas} parcelas foram geradas.`, 'Sucesso', () => {
            this.router.navigate(['/clientes']);
          });
        }
      } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        this.modalService.showError('Erro ao salvar cliente. Verifique o console para mais detalhes.');
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.marcarCamposComoTocados();
    }
  }

  marcarCamposComoTocados(): void {
    Object.keys(this.clienteForm.controls).forEach(key => {
      this.clienteForm.get(key)?.markAsTouched();
    });
  }

  cancelar(): void {
    this.router.navigate(['/clientes']);
  }

  /**
   * Verifica se houve mudanças que requerem recálculo das parcelas
   */
  private verificarMudancasRelevantes(clienteAnterior: Cliente): boolean {
    const formValue = this.clienteForm.value;

    // Converter valores do formulário
    let valorTotal = formValue.valorTotal;
    let valorEntrada = formValue.valorEntrada;

    if (typeof valorTotal === 'string') {
      valorTotal = parseFloat(valorTotal.replace(/\./g, '').replace(',', '.'));
    }
    if (typeof valorEntrada === 'string') {
      valorEntrada = parseFloat(valorEntrada.replace(/\./g, '').replace(',', '.'));
    }

    const novaDataPrimeiroVencimento = new Date(formValue.dataPrimeiroVencimento + 'T12:00:00');
    const dataAnterior = this.criarDataSegura(clienteAnterior.contrato.dataPrimeiroVencimento);

    return (
      clienteAnterior.contrato.valorTotal !== valorTotal ||
      clienteAnterior.contrato.valorEntrada !== valorEntrada ||
      clienteAnterior.contrato.numeroParcelas !== parseInt(formValue.numeroParcelas) ||
      dataAnterior.getTime() !== novaDataPrimeiroVencimento.getTime()
    );
  }

  get f() {
    return this.clienteForm.controls;
  }
}
