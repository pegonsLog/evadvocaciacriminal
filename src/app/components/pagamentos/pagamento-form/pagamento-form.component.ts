import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';
import { Cliente, Pagamento } from '../../../models/cliente.model';
import { provideNgxMask, NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-pagamento-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxMaskDirective],
  providers: [provideNgxMask()],
  templateUrl: './pagamento-form.component.html',
  styleUrl: './pagamento-form.component.scss'
})
export class PagamentoFormComponent implements OnInit {
  pagamentoForm!: FormGroup;
  isEditMode = false;
  pagamentoId?: string;
  clienteId?: string;
  cliente?: Cliente;
  diasAtraso: number = 0;

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    const pagamentoId = this.route.snapshot.paramMap.get('id');
    this.clienteId = this.route.snapshot.paramMap.get('clienteId') || undefined;

    if (pagamentoId) {
      this.isEditMode = true;
      this.pagamentoId = pagamentoId;
      this.carregarPagamento(pagamentoId);
    } else if (this.clienteId) {
      this.cliente = this.clienteService.getClienteById(this.clienteId);
    }
  }

  initForm(): void {
    this.pagamentoForm = this.fb.group({
      valorPago: ['', [Validators.required, Validators.min(0.01)]],
      dataVencimento: ['', [Validators.required]],
      dataPagamento: ['', [Validators.required]],
      observacao: ['']
    });

    // Calcular dias de atraso automaticamente
    this.pagamentoForm.get('dataVencimento')?.valueChanges.subscribe(() => this.calcularDiasAtraso());
    this.pagamentoForm.get('dataPagamento')?.valueChanges.subscribe(() => this.calcularDiasAtraso());
  }

  calcularDiasAtraso(): void {
    const dataVencimento = this.pagamentoForm.get('dataVencimento')?.value;
    const dataPagamento = this.pagamentoForm.get('dataPagamento')?.value;

    if (dataVencimento && dataPagamento) {
      const vencimento = new Date(dataVencimento);
      const pagamento = new Date(dataPagamento);
      
      vencimento.setHours(0, 0, 0, 0);
      pagamento.setHours(0, 0, 0, 0);
      
      const diffTime = pagamento.getTime() - vencimento.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      this.diasAtraso = diffDays > 0 ? diffDays : 0;
    }
  }

  carregarPagamento(id: string): void {
    const pagamentos = this.clienteService.getPagamentos();
    pagamentos.subscribe(lista => {
      const pagamento = lista.find(p => p.id === id);
      if (pagamento) {
        this.pagamentoForm.patchValue({
          valorPago: pagamento.valorPago,
          observacao: pagamento.observacao
        });
        this.clienteId = pagamento.clienteId;
        this.cliente = this.clienteService.getClienteById(pagamento.clienteId);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.pagamentoForm.valid && this.cliente) {
      const formValue = this.pagamentoForm.value;
      
      // Remove formatação do valor e garante que seja número
      let valorPago = formValue.valorPago;
      if (typeof valorPago === 'string') {
        valorPago = parseFloat(valorPago.replace(/\./g, '').replace(',', '.'));
      }
      // Garante que é um número válido
      valorPago = Number(valorPago) || 0;
      
      const pagamento: Pagamento = {
        id: this.pagamentoId || '',
        clienteId: this.cliente.id,
        clienteNome: this.cliente.nome,
        valorPago: valorPago,
        dataPagamento: new Date(formValue.dataPagamento),
        dataVencimento: new Date(formValue.dataVencimento),
        diasAtraso: this.diasAtraso,
        observacao: formValue.observacao
      };

      try {
        if (this.isEditMode) {
          await this.clienteService.updatePagamento(pagamento);
        } else {
          await this.clienteService.addPagamento(pagamento);
        }
        this.router.navigate(['/pagamentos', this.cliente.id]);
      } catch (error) {
        console.error('Erro ao salvar pagamento:', error);
        alert('Erro ao salvar pagamento.');
      }
    }
  }

  cancelar(): void {
    if (this.cliente) {
      this.router.navigate(['/pagamentos', this.cliente.id]);
    }
  }

  get f() {
    return this.pagamentoForm.controls;
  }
}
