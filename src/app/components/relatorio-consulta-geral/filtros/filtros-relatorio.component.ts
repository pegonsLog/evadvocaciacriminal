import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FiltrosRelatorio, StatusPagamento } from '../../../models/relatorio.model';
import { Cliente } from '../../../models/cliente.model';
import { ClienteService } from '../../../services/cliente.service';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../models/user.model';

@Component({
    selector: 'app-filtros-relatorio',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgbModule],
    templateUrl: './filtros-relatorio.component.html',
    styleUrls: ['./filtros-relatorio.component.scss']
})
export class FiltrosRelatorioComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private fb = inject(FormBuilder);
    private clienteService = inject(ClienteService);
    private authService = inject(AuthService);

    @Input() filtrosIniciais: FiltrosRelatorio = {};
    @Output() filtrosChange = new EventEmitter<FiltrosRelatorio>();

    // Formulário reativo
    filtrosForm: FormGroup;

    // Dados para os selects
    clientes: Cliente[] = [];
    statusOptions = [
        { value: StatusPagamento.PENDENTE, label: 'Pendente' },
        { value: StatusPagamento.PAGO, label: 'Pago' },
        { value: StatusPagamento.ATRASADO, label: 'Atrasado' }
    ];

    // Períodos pré-definidos
    periodosPredefinidos = [
        { label: 'Último mês', dias: 30 },
        { label: 'Últimos 3 meses', dias: 90 },
        { label: 'Últimos 6 meses', dias: 180 },
        { label: 'Último ano', dias: 365 }
    ];

    // Estado do componente
    carregandoClientes = false;
    isAdmin = false;

    constructor() {
        this.filtrosForm = this.fb.group({
            dataInicio: [null],
            dataFim: [null],
            statusPagamento: [[]],
            clienteId: [null],
            valorMinimo: [null, [Validators.min(0)]],
            valorMaximo: [null, [Validators.min(0)]]
        });
    }

    ngOnInit(): void {
        this.inicializarComponente();
        this.configurarObservadores();
        this.carregarClientes();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Inicializa o componente com os filtros iniciais
     */
    private inicializarComponente(): void {
        // Verificar se o usuário é admin
        this.authService.currentUser$
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                this.isAdmin = user?.role === UserRole.ADMIN;

                // Se não for admin, desabilitar o filtro de cliente
                if (!this.isAdmin) {
                    this.filtrosForm.get('clienteId')?.disable();
                }
            });

        // Aplicar filtros iniciais se fornecidos
        if (this.filtrosIniciais && Object.keys(this.filtrosIniciais).length > 0) {
            this.aplicarFiltrosIniciais();
        }

        // Carregar filtros salvos do sessionStorage
        this.carregarFiltrosSalvos();
    }

    /**
     * Configura observadores para mudanças no formulário
     */
    private configurarObservadores(): void {
        // Observar mudanças no formulário com debounce
        this.filtrosForm.valueChanges
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(valores => {
                if (this.filtrosForm.valid) {
                    const filtros = this.construirFiltros(valores);
                    this.emitirFiltros(filtros);
                    this.salvarFiltros(filtros);
                }
            });
    }

    /**
     * Carrega lista de clientes para o filtro (apenas para admin)
     */
    private carregarClientes(): void {
        if (!this.isAdmin) return;

        this.carregandoClientes = true;
        this.clienteService.getClientes()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (clientes) => {
                    this.clientes = clientes.sort((a, b) => a.nome.localeCompare(b.nome));
                    this.carregandoClientes = false;
                },
                error: (error) => {
                    console.error('Erro ao carregar clientes:', error);
                    this.carregandoClientes = false;
                }
            });
    }

    /**
     * Aplica filtros iniciais ao formulário
     */
    private aplicarFiltrosIniciais(): void {
        const valores: any = {};

        if (this.filtrosIniciais.dataInicio) {
            valores.dataInicio = this.formatarDataParaInput(this.filtrosIniciais.dataInicio);
        }

        if (this.filtrosIniciais.dataFim) {
            valores.dataFim = this.formatarDataParaInput(this.filtrosIniciais.dataFim);
        }

        if (this.filtrosIniciais.statusPagamento) {
            valores.statusPagamento = this.filtrosIniciais.statusPagamento;
        }

        if (this.filtrosIniciais.clienteId) {
            valores.clienteId = this.filtrosIniciais.clienteId;
        }

        if (this.filtrosIniciais.valorMinimo !== undefined) {
            valores.valorMinimo = this.filtrosIniciais.valorMinimo;
        }

        if (this.filtrosIniciais.valorMaximo !== undefined) {
            valores.valorMaximo = this.filtrosIniciais.valorMaximo;
        }

        this.filtrosForm.patchValue(valores);
    }

    /**
     * Constrói objeto de filtros a partir dos valores do formulário
     */
    private construirFiltros(valores: any): FiltrosRelatorio {
        const filtros: FiltrosRelatorio = {};

        if (valores.dataInicio) {
            filtros.dataInicio = new Date(valores.dataInicio);
        }

        if (valores.dataFim) {
            filtros.dataFim = new Date(valores.dataFim);
        }

        if (valores.statusPagamento && valores.statusPagamento.length > 0) {
            filtros.statusPagamento = valores.statusPagamento;
        }

        if (valores.clienteId) {
            filtros.clienteId = valores.clienteId;
        }

        if (valores.valorMinimo !== null && valores.valorMinimo !== undefined) {
            filtros.valorMinimo = Number(valores.valorMinimo);
        }

        if (valores.valorMaximo !== null && valores.valorMaximo !== undefined) {
            filtros.valorMaximo = Number(valores.valorMaximo);
        }

        return filtros;
    }

    /**
     * Emite os filtros para o componente pai
     */
    private emitirFiltros(filtros: FiltrosRelatorio): void {
        this.filtrosChange.emit(filtros);
    }

    /**
     * Aplica período pré-definido
     */
    aplicarPeriodoPredefinido(dias: number): void {
        const hoje = new Date();
        const dataInicio = new Date();
        dataInicio.setDate(hoje.getDate() - dias);

        this.filtrosForm.patchValue({
            dataInicio: this.formatarDataParaInput(dataInicio),
            dataFim: this.formatarDataParaInput(hoje)
        });
    }

    /**
     * Limpa todos os filtros
     */
    limparFiltros(): void {
        this.filtrosForm.reset();
        this.removerFiltrosSalvos();

        // Emitir filtros vazios
        this.emitirFiltros({});
    }

    /**
     * Valida se a data de início é anterior à data de fim
     */
    validarDatas(): boolean {
        const dataInicio = this.filtrosForm.get('dataInicio')?.value;
        const dataFim = this.filtrosForm.get('dataFim')?.value;

        if (dataInicio && dataFim) {
            return new Date(dataInicio) <= new Date(dataFim);
        }

        return true;
    }

    /**
     * Valida se o valor mínimo é menor que o máximo
     */
    validarValores(): boolean {
        const valorMinimo = this.filtrosForm.get('valorMinimo')?.value;
        const valorMaximo = this.filtrosForm.get('valorMaximo')?.value;

        if (valorMinimo !== null && valorMaximo !== null) {
            return Number(valorMinimo) <= Number(valorMaximo);
        }

        return true;
    }

    /**
     * Verifica se o formulário tem erros de validação
     */
    temErrosValidacao(): boolean {
        return !this.validarDatas() || !this.validarValores() || this.filtrosForm.invalid;
    }

    /**
     * Obtém mensagem de erro de validação
     */
    obterMensagemErro(): string {
        if (!this.validarDatas()) {
            return 'A data de início deve ser anterior à data de fim.';
        }

        if (!this.validarValores()) {
            return 'O valor mínimo deve ser menor que o valor máximo.';
        }

        if (this.filtrosForm.get('valorMinimo')?.hasError('min')) {
            return 'O valor mínimo deve ser maior ou igual a zero.';
        }

        if (this.filtrosForm.get('valorMaximo')?.hasError('min')) {
            return 'O valor máximo deve ser maior ou igual a zero.';
        }

        return '';
    }

    /**
     * Formata data para input HTML
     */
    private formatarDataParaInput(data: Date): string {
        return data.toISOString().split('T')[0];
    }

    /**
     * Salva filtros no sessionStorage
     */
    private salvarFiltros(filtros: FiltrosRelatorio): void {
        try {
            sessionStorage.setItem('relatorio-filtros', JSON.stringify(filtros));
        } catch (error) {
            console.warn('Erro ao salvar filtros no sessionStorage:', error);
        }
    }

    /**
     * Carrega filtros salvos do sessionStorage
     */
    private carregarFiltrosSalvos(): void {
        try {
            const filtrosSalvos = sessionStorage.getItem('relatorio-filtros');
            if (filtrosSalvos) {
                const filtros: FiltrosRelatorio = JSON.parse(filtrosSalvos);
                this.aplicarFiltrosCarregados(filtros);
            }
        } catch (error) {
            console.warn('Erro ao carregar filtros do sessionStorage:', error);
        }
    }

    /**
     * Aplica filtros carregados do sessionStorage
     */
    private aplicarFiltrosCarregados(filtros: FiltrosRelatorio): void {
        const valores: any = {};

        if (filtros.dataInicio) {
            valores.dataInicio = this.formatarDataParaInput(new Date(filtros.dataInicio));
        }

        if (filtros.dataFim) {
            valores.dataFim = this.formatarDataParaInput(new Date(filtros.dataFim));
        }

        if (filtros.statusPagamento) {
            valores.statusPagamento = filtros.statusPagamento;
        }

        if (filtros.clienteId) {
            valores.clienteId = filtros.clienteId;
        }

        if (filtros.valorMinimo !== undefined) {
            valores.valorMinimo = filtros.valorMinimo;
        }

        if (filtros.valorMaximo !== undefined) {
            valores.valorMaximo = filtros.valorMaximo;
        }

        this.filtrosForm.patchValue(valores);
    }

    /**
     * Remove filtros salvos do sessionStorage
     */
    private removerFiltrosSalvos(): void {
        try {
            sessionStorage.removeItem('relatorio-filtros');
        } catch (error) {
            console.warn('Erro ao remover filtros do sessionStorage:', error);
        }
    }

    /**
     * Obtém nome do cliente pelo ID
     */
    obterNomeCliente(clienteId: string): string {
        const cliente = this.clientes.find(c => c.id === clienteId);
        return cliente ? cliente.nome : 'Cliente não encontrado';
    }

    /**
     * Verifica se há filtros ativos
     */
    temFiltrosAtivos(): boolean {
        const valores = this.filtrosForm.value;
        return Object.values(valores).some(valor =>
            valor !== null && valor !== undefined &&
            (Array.isArray(valor) ? valor.length > 0 : true)
        );
    }
}
