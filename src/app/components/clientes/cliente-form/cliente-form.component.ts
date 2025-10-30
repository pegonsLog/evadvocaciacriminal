import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';
import { ParcelaService } from '../../../services/parcela.service';
import { Cliente } from '../../../models/cliente.model';
import { provideNgxMask, NgxMaskDirective } from 'ngx-mask';

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

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private parcelaService: ParcelaService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

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
      valorEntrada: ['', [Validators.required, Validators.min(0)]],
      valorTotal: ['', [Validators.required, Validators.min(0.01)]],
      numeroParcelas: ['', [Validators.required, Validators.min(1)]],
      valorParcela: ['', [Validators.required, Validators.min(0.01)]],
      diaVencimento: ['', [Validators.required, Validators.min(1), Validators.max(31)]],
      estimativaValorPrevisto: [''],
      relatorioContratosPendentes: ['']
    });

    // Calcular valor da parcela automaticamente
    this.clienteForm.get('valorTotal')?.valueChanges.subscribe(() => this.calcularParcela());
    this.clienteForm.get('numeroParcelas')?.valueChanges.subscribe(() => this.calcularParcela());
  }

  calcularParcela(): void {
    let valorTotal = this.clienteForm.get('valorTotal')?.value;
    let numeroParcelas = this.clienteForm.get('numeroParcelas')?.value;

    // Remove formatação para cálculo
    if (typeof valorTotal === 'string') {
      valorTotal = parseFloat(valorTotal.replace(/\./g, '').replace(',', '.'));
    }
    if (typeof numeroParcelas === 'string') {
      numeroParcelas = parseInt(numeroParcelas);
    }

    if (valorTotal && numeroParcelas && numeroParcelas > 0) {
      const valorParcela = valorTotal / numeroParcelas;
      this.clienteForm.patchValue({ 
        valorParcela: this.formatarMoeda(valorParcela) 
      }, { emitEvent: false });
    }
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        numeroContrato: cliente.compra.numeroContrato,
        valorEntrada: cliente.compra.valorEntrada,
        valorTotal: cliente.compra.valorTotal,
        numeroParcelas: cliente.compra.numeroParcelas,
        valorParcela: cliente.compra.valorParcela,
        diaVencimento: cliente.compra.diaVencimento,
        estimativaValorPrevisto: cliente.compra.estimativaValorPrevisto,
        relatorioContratosPendentes: cliente.compra.relatorioContratosPendentes
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.clienteForm.valid) {
      const formValue = this.clienteForm.value;
      
      // Remove formatação dos valores
      let valorEntrada = formValue.valorEntrada;
      let valorTotal = formValue.valorTotal;
      let valorParcela = formValue.valorParcela;
      let estimativaValorPrevisto = formValue.estimativaValorPrevisto;
      
      if (typeof valorEntrada === 'string') {
        valorEntrada = parseFloat(valorEntrada.replace(/\./g, '').replace(',', '.'));
      }
      if (typeof valorTotal === 'string') {
        valorTotal = parseFloat(valorTotal.replace(/\./g, '').replace(',', '.'));
      }
      if (typeof valorParcela === 'string') {
        valorParcela = parseFloat(valorParcela.replace(/\./g, '').replace(',', '.'));
      }
      if (typeof estimativaValorPrevisto === 'string' && estimativaValorPrevisto) {
        estimativaValorPrevisto = parseFloat(estimativaValorPrevisto.replace(/\./g, '').replace(',', '.'));
      }
      
      const cliente: Cliente = {
        id: this.clienteId || '',
        nome: formValue.nome,
        cpf: formValue.cpf,
        telefone: formValue.telefone,
        email: formValue.email,
        endereco: formValue.endereco,
        dataCadastro: new Date(),
        compra: {
          numeroContrato: formValue.numeroContrato,
          valorEntrada: valorEntrada,
          valorTotal: valorTotal,
          numeroParcelas: parseInt(formValue.numeroParcelas),
          valorParcela: valorParcela,
          dataCompra: new Date(),
          diaVencimento: parseInt(formValue.diaVencimento),
          estimativaValorPrevisto: estimativaValorPrevisto || 0,
          relatorioContratosPendentes: formValue.relatorioContratosPendentes || ''
        }
      };

      try {
        if (this.isEditMode) {
          await this.clienteService.updateCliente(cliente);
        } else {
          // Adicionar cliente e obter o ID gerado
          const clienteId = await this.clienteService.addCliente(cliente);
          
          // Atualizar o objeto cliente com o ID correto
          cliente.id = clienteId;
          
          // Gerar parcelas automaticamente com o ID correto
          await this.parcelaService.gerarParcelas(cliente);
          
          alert(`Cliente cadastrado com sucesso! ${cliente.compra.numeroParcelas} parcelas foram geradas.`);
        }
        this.router.navigate(['/clientes']);
      } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        alert('Erro ao salvar cliente. Verifique o console para mais detalhes.');
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

  get f() {
    return this.clienteForm.controls;
  }
}
