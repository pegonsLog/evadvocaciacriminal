import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { RelatorioService } from '../../../services/relatorio.service';
import { AuthService } from '../../../services/auth.service';
import {
  PrevisaoRecebimentosMes,
  ParcelaPrevisao,
  ResumoPrevisaoMes,
  FiltrosRelatorio,
  StatusPagamento,
  TipoParcela
} from '../../../models/relatorio.model';
import { User, UserRole } from '../../../models/user.model';

@Component({
  selector: 'app-previsao-recebimentos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbModule],
  templateUrl: './previsao-recebimentos.component.html',
  styleUrls: ['./previsao-recebimentos.component.scss']
})
export class PrevisaoRecebimentosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private relatorioService = inject(RelatorioService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Inputs e Outputs
  @Input() usuarioAtual: User | null = null;
  @Input() filtrosGlobais: FiltrosRelatorio = {};
  @Input() mesInicial?: Date;

  @Output() mesAlterado = new EventEmitter<{ mes: number, ano: number }>();
  @Output() parcelaClicada = new EventEmitter<ParcelaPrevisao>();
  @Output() filtroAplicado = new EventEmitter<FiltrosRelatorio>();

  // Propriedades do componente
  mesSelecionado: Date = new Date();
  dadosPrevisao: PrevisaoRecebimentosMes | null = null;
  carregando: boolean = false;
  erro: string | null = null;

  // Controles de navegação
  mesMinimo: Date = new Date(2020, 0, 1); // Janeiro 2020
  mesMaximo: Date = new Date();

  // Filtros específicos
  filtroForm: FormGroup;
  clienteFiltrado: string | null = null;
  statusFiltrado: StatusPagamento[] = [];

  // Paginação para tabela de parcelas
  paginaAtual: number = 1;
  itensPorPagina: number = 10;
  parcelasPaginadas: ParcelaPrevisao[] = [];

  // Permissões
  podeVerTodosClientes: boolean = false;
  podeEditarParcelas: boolean = false;

  // Modal de detalhes da parcela
  mostrarModalDetalhes: boolean = false;
  parcelaSelecionada: ParcelaPrevisao | null = null;

  // Controles de exportação
  exportandoPDF: boolean = false;
  dropdownAberto: boolean = false;

  // Enums para template
  StatusPagamento = StatusPagamento;
  TipoParcela = TipoParcela;
  UserRole = UserRole;

  constructor() {
    // Inicializar formulário de filtros
    this.filtroForm = this.fb.group({
      clienteFiltrado: [''],
      statusFiltrado: [[]]
    });

    // Configurar mês máximo para o próximo ano
    const proximoAno = new Date();
    proximoAno.setFullYear(proximoAno.getFullYear() + 1);
    this.mesMaximo = proximoAno;
  }

  ngOnInit(): void {
    // Configurar mês inicial
    if (this.mesInicial) {
      this.mesSelecionado = new Date(this.mesInicial);
    }

    // Verificar permissões do usuário
    this.verificarPermissoes();

    // Configurar observadores do formulário
    this.configurarObservadoresFormulario();

    // Carregar dados iniciais
    this.carregarDadosMes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Verifica permissões do usuário atual
   */
  private verificarPermissoes(): void {
    if (this.usuarioAtual) {
      this.podeVerTodosClientes = this.usuarioAtual.role === UserRole.ADMIN;
      this.podeEditarParcelas = this.usuarioAtual.role === UserRole.ADMIN;
    }
  }

  /**
   * Configura observadores do formulário de filtros
   */
  private configurarObservadoresFormulario(): void {
    // Observar mudanças nos filtros com debounce
    this.filtroForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(valores => {
        this.clienteFiltrado = valores.clienteFiltrado || null;
        this.statusFiltrado = valores.statusFiltrado || [];
        this.aplicarFiltros();
      });
  }

  /**
   * Carrega dados do mês selecionado
   */
  carregarDadosMes(): void {
    if (this.carregando) return;



    this.carregando = true;
    this.erro = null;

    const mes = this.mesSelecionado.getMonth();
    const ano = this.mesSelecionado.getFullYear();
    const usuarioId = this.podeVerTodosClientes ? undefined : this.usuarioAtual?.email;

    this.relatorioService.obterPrevisaoRecebimentosMes(mes, ano, usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dados) => {
          this.dadosPrevisao = dados;
          this.atualizarPaginacao();
          this.carregando = false;

          // Emitir evento de mudança de mês
          this.mesAlterado.emit({ mes, ano });
        },
        error: (error) => {
          console.error('Erro ao carregar previsão:', error);
          this.erro = 'Erro ao carregar dados de previsão. Tente novamente.';
          this.carregando = false;
        }
      });
  }

  /**
   * Aplica filtros aos dados carregados
   */
  aplicarFiltros(): void {
    if (!this.dadosPrevisao) return;

    let parcelasFiltradas = [...this.dadosPrevisao.parcelas];

    // Filtro por cliente
    if (this.clienteFiltrado) {
      parcelasFiltradas = parcelasFiltradas.filter(p =>
        p.clienteId === this.clienteFiltrado
      );
    }

    // Filtro por status
    if (this.statusFiltrado.length > 0) {
      parcelasFiltradas = parcelasFiltradas.filter(p =>
        this.statusFiltrado.includes(p.status)
      );
    }

    // Atualizar dados de previsão com filtros aplicados
    const resumoFiltrado = this.calcularResumoFiltrado(parcelasFiltradas);

    this.dadosPrevisao = {
      ...this.dadosPrevisao,
      parcelas: parcelasFiltradas,
      resumo: resumoFiltrado,
      totalPrevisto: resumoFiltrado.valorTotal
    };

    // Resetar paginação
    this.paginaAtual = 1;
    this.atualizarPaginacao();

    // Emitir filtros aplicados
    const filtros: FiltrosRelatorio = {};
    if (this.clienteFiltrado) {
      filtros.clienteId = this.clienteFiltrado;
    }
    if (this.statusFiltrado.length > 0) {
      filtros.statusPagamento = this.statusFiltrado;
    }
    this.filtroAplicado.emit(filtros);
  }

  /**
   * Calcula resumo para parcelas filtradas
   */
  private calcularResumoFiltrado(parcelas: ParcelaPrevisao[]): ResumoPrevisaoMes {
    const resumo: ResumoPrevisaoMes = {
      totalParcelas: parcelas.length,
      valorTotal: 0,
      parcelasNormais: 0,
      valorNormais: 0,
      parcelasAtrasadas: 0,
      valorAtrasadas: 0,
      parcelasRenegociadas: 0,
      valorRenegociadas: 0,
      parcelasPendentes: 0,
      valorPendentes: 0
    };

    parcelas.forEach(parcela => {
      resumo.valorTotal += parcela.valorParcela;

      // Contar por status
      switch (parcela.status) {
        case StatusPagamento.ATRASADO:
          resumo.parcelasAtrasadas++;
          resumo.valorAtrasadas += parcela.valorParcela;
          break;
        case StatusPagamento.PENDENTE:
          resumo.parcelasPendentes++;
          resumo.valorPendentes += parcela.valorParcela;
          break;
      }

      // Contar por tipo
      switch (parcela.tipoParcela) {
        case TipoParcela.RENEGOCIADA:
          resumo.parcelasRenegociadas++;
          resumo.valorRenegociadas += parcela.valorParcela;
          break;
        default:
          resumo.parcelasNormais++;
          resumo.valorNormais += parcela.valorParcela;
          break;
      }
    });

    return resumo;
  }

  /**
   * Atualiza paginação das parcelas
   */
  private atualizarPaginacao(): void {
    if (!this.dadosPrevisao) {
      this.parcelasPaginadas = [];
      return;
    }

    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    this.parcelasPaginadas = this.dadosPrevisao.parcelas.slice(inicio, fim);
  }

  // ========== MÉTODOS DE NAVEGAÇÃO TEMPORAL ==========

  /**
   * Navega para o mês anterior
   */
  navegarMesAnterior(): void {
    const novoMes = new Date(this.mesSelecionado);
    novoMes.setMonth(novoMes.getMonth() - 1);

    if (novoMes >= this.mesMinimo) {
      this.mesSelecionado = novoMes;
      this.carregarDadosMes();
    }
  }

  /**
   * Navega para o próximo mês
   */
  navegarMesProximo(): void {
    const novoMes = new Date(this.mesSelecionado);
    novoMes.setMonth(novoMes.getMonth() + 1);

    if (novoMes <= this.mesMaximo) {
      this.mesSelecionado = novoMes;
      this.carregarDadosMes();
    }
  }

  /**
   * Seleciona um mês específico
   */
  selecionarMes(mes: number, ano: number): void {
    const novaData = new Date(ano, mes, 1);

    if (novaData >= this.mesMinimo && novaData <= this.mesMaximo) {
      this.mesSelecionado = novaData;
      this.carregarDadosMes();
    }
  }

  /**
   * Vai para o mês atual
   */
  irParaMesAtual(): void {
    const hoje = new Date();
    this.selecionarMes(hoje.getMonth(), hoje.getFullYear());
  }

  /**
   * Vai para o próximo mês
   */
  irParaProximoMes(): void {
    const proximoMes = new Date();
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    this.selecionarMes(proximoMes.getMonth(), proximoMes.getFullYear());
  }

  // ========== MÉTODOS DE EVENTOS ==========

  /**
   * Manipula mudança de cliente no filtro
   */
  onClienteChange(clienteId: string): void {
    this.filtroForm.patchValue({ clienteFiltrado: clienteId });
  }

  /**
   * Manipula mudança de status no filtro
   */
  onStatusChange(status: StatusPagamento[]): void {
    this.filtroForm.patchValue({ statusFiltrado: status });
  }

  /**
   * Manipula mudança de checkbox de status
   */
  onStatusCheckboxChange(status: StatusPagamento, event: any): void {
    const isChecked = event.target.checked;
    let novosStatus = [...this.statusFiltrado];

    if (isChecked) {
      if (!novosStatus.includes(status)) {
        novosStatus.push(status);
      }
    } else {
      novosStatus = novosStatus.filter(s => s !== status);
    }

    this.onStatusChange(novosStatus);
  }

  /**
   * Manipula mudança de página
   */
  onPaginaChange(pagina: number): void {
    this.paginaAtual = pagina;
    this.atualizarPaginacao();
  }

  /**
   * Manipula clique em parcela
   */
  onParcelaClick(parcela: ParcelaPrevisao): void {
    this.abrirModalDetalhes(parcela);
    this.parcelaClicada.emit(parcela);
  }

  /**
   * Abre modal com detalhes da parcela
   */
  abrirModalDetalhes(parcela: ParcelaPrevisao): void {
    this.parcelaSelecionada = parcela;
    this.mostrarModalDetalhes = true;
  }

  /**
   * Fecha modal de detalhes
   */
  fecharModalDetalhes(): void {
    this.mostrarModalDetalhes = false;
    this.parcelaSelecionada = null;
  }

  // ========== MÉTODOS UTILITÁRIOS ==========

  /**
   * Formata mês e ano para exibição
   */
  formatarMesAno(data: Date): string {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return `${meses[data.getMonth()]} ${data.getFullYear()}`;
  }

  /**
   * Obtém resumo do mês atual
   */
  obterResumoMes(): ResumoPrevisaoMes | null {
    return this.dadosPrevisao?.resumo || null;
  }

  /**
   * Calcula percentual de um tipo específico
   */
  calcularPercentualTipo(tipo: 'normais' | 'atrasadas' | 'renegociadas' | 'pendentes'): number {
    const resumo = this.obterResumoMes();
    if (!resumo || resumo.valorTotal === 0) return 0;

    switch (tipo) {
      case 'normais':
        return (resumo.valorNormais / resumo.valorTotal) * 100;
      case 'atrasadas':
        return (resumo.valorAtrasadas / resumo.valorTotal) * 100;
      case 'renegociadas':
        return (resumo.valorRenegociadas / resumo.valorTotal) * 100;
      case 'pendentes':
        return (resumo.valorPendentes / resumo.valorTotal) * 100;
      default:
        return 0;
    }
  }

  /**
   * Obtém classe CSS para status da parcela
   */
  obterClasseStatus(status: StatusPagamento): string {
    switch (status) {
      case StatusPagamento.PAGO:
        return 'badge bg-success';
      case StatusPagamento.PENDENTE:
        return 'badge bg-warning';
      case StatusPagamento.ATRASADO:
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  /**
   * Obtém classe CSS para tipo da parcela
   */
  obterClasseTipo(tipo: TipoParcela): string {
    switch (tipo) {
      case TipoParcela.ENTRADA:
        return 'badge bg-primary';
      case TipoParcela.FINAL:
        return 'badge bg-info';
      case TipoParcela.RENEGOCIADA:
        return 'badge bg-warning';
      default:
        return 'badge bg-light text-dark';
    }
  }

  /**
   * Verifica se pode navegar para mês anterior
   */
  podeNavegar(direcao: 'anterior' | 'proximo'): boolean {
    if (direcao === 'anterior') {
      const mesAnterior = new Date(this.mesSelecionado);
      mesAnterior.setMonth(mesAnterior.getMonth() - 1);
      return mesAnterior >= this.mesMinimo;
    } else {
      const mesProximo = new Date(this.mesSelecionado);
      mesProximo.setMonth(mesProximo.getMonth() + 1);
      return mesProximo <= this.mesMaximo;
    }
  }

  /**
   * Obtém número total de páginas
   */
  obterTotalPaginas(): number {
    if (!this.dadosPrevisao) return 0;
    return Math.ceil(this.dadosPrevisao.parcelas.length / this.itensPorPagina);
  }

  /**
   * Obtém array de páginas para paginação
   */
  obterPaginas(): number[] {
    const totalPaginas = this.obterTotalPaginas();
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  /**
   * TrackBy function para otimizar performance da lista de parcelas
   */
  trackByParcelaId(index: number, parcela: ParcelaPrevisao): string {
    return parcela.parcelaId;
  }

  // ========== MÉTODOS DE NAVEGAÇÃO TEMPORAL AVANÇADA ==========

  /**
   * Vai para o mês anterior
   */
  irParaMesAnterior(): void {
    this.navegarMesAnterior();
  }

  /**
   * Navega para trimestre específico
   */
  irParaTrimestre(tipo: 'atual' | 'proximo'): void {
    const hoje = new Date();
    let mesDestino: number;
    let anoDestino: number;

    if (tipo === 'atual') {
      // Primeiro mês do trimestre atual
      const trimestreAtual = Math.floor(hoje.getMonth() / 3);
      mesDestino = trimestreAtual * 3;
      anoDestino = hoje.getFullYear();
    } else {
      // Primeiro mês do próximo trimestre
      const proximoTrimestre = Math.floor(hoje.getMonth() / 3) + 1;
      if (proximoTrimestre > 3) {
        mesDestino = 0; // Janeiro do próximo ano
        anoDestino = hoje.getFullYear() + 1;
      } else {
        mesDestino = proximoTrimestre * 3;
        anoDestino = hoje.getFullYear();
      }
    }

    this.selecionarMes(mesDestino, anoDestino);
  }

  /**
   * Navega para ano específico
   */
  irParaAno(tipo: 'atual' | 'proximo'): void {
    const hoje = new Date();
    let anoDestino: number;

    if (tipo === 'atual') {
      anoDestino = hoje.getFullYear();
    } else {
      anoDestino = hoje.getFullYear() + 1;
    }

    // Ir para janeiro do ano selecionado
    this.selecionarMes(0, anoDestino);
  }

  /**
   * Manipula mudança manual de mês
   */
  onMesManualChange(event: any): void {
    const novoMes = parseInt(event.target.value);
    const anoAtual = this.mesSelecionado.getFullYear();
    this.selecionarMes(novoMes, anoAtual);
  }

  /**
   * Manipula mudança manual de ano
   */
  onAnoManualChange(event: any): void {
    const novoAno = parseInt(event.target.value);
    const mesAtual = this.mesSelecionado.getMonth();
    this.selecionarMes(mesAtual, novoAno);
  }

  /**
   * Obtém lista de anos disponíveis para seleção
   */
  obterAnosDisponiveis(): number[] {
    const anoMinimo = this.mesMinimo.getFullYear();
    const anoMaximo = this.mesMaximo.getFullYear();
    const anos: number[] = [];

    for (let ano = anoMinimo; ano <= anoMaximo; ano++) {
      anos.push(ano);
    }

    return anos;
  }

  /**
   * Obtém informações do trimestre atual
   */
  obterInfoTrimestre(data: Date): { trimestre: number; anoTrimestre: number; mesesTrimestre: string[] } {
    const trimestre = Math.floor(data.getMonth() / 3) + 1;
    const anoTrimestre = data.getFullYear();

    const todosMeses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const inicioTrimestre = (trimestre - 1) * 3;
    const mesesTrimestre = todosMeses.slice(inicioTrimestre, inicioTrimestre + 3);

    return { trimestre, anoTrimestre, mesesTrimestre };
  }

  /**
   * Verifica se uma data está no trimestre atual
   */
  estaNoTrimestreAtual(data: Date): boolean {
    const hoje = new Date();
    const trimestreHoje = Math.floor(hoje.getMonth() / 3);
    const trimestreData = Math.floor(data.getMonth() / 3);

    return trimestreHoje === trimestreData && hoje.getFullYear() === data.getFullYear();
  }

  /**
   * Verifica se uma data está no ano atual
   */
  estaNoAnoAtual(data: Date): boolean {
    const hoje = new Date();
    return hoje.getFullYear() === data.getFullYear();
  }

  /**
   * Obtém label descritivo para o período selecionado
   */
  obterLabelPeriodo(): string {
    const hoje = new Date();

    if (this.estaNoAnoAtual(this.mesSelecionado)) {
      if (this.mesSelecionado.getMonth() === hoje.getMonth()) {
        return 'Mês Atual';
      } else if (this.estaNoTrimestreAtual(this.mesSelecionado)) {
        return 'Trimestre Atual';
      } else {
        return 'Ano Atual';
      }
    } else if (this.mesSelecionado.getFullYear() === hoje.getFullYear() + 1) {
      return 'Próximo Ano';
    } else if (this.mesSelecionado.getFullYear() < hoje.getFullYear()) {
      return 'Período Anterior';
    } else {
      return 'Período Futuro';
    }
  }

  /**
   * Navega para período relativo (útil para atalhos de teclado)
   */
  navegarPeriodoRelativo(direcao: 'anterior' | 'proximo', unidade: 'mes' | 'trimestre' | 'ano'): void {
    const novaData = new Date(this.mesSelecionado);

    switch (unidade) {
      case 'mes':
        if (direcao === 'anterior') {
          novaData.setMonth(novaData.getMonth() - 1);
        } else {
          novaData.setMonth(novaData.getMonth() + 1);
        }
        break;

      case 'trimestre':
        const mesesPorTrimestre = 3;
        if (direcao === 'anterior') {
          novaData.setMonth(novaData.getMonth() - mesesPorTrimestre);
        } else {
          novaData.setMonth(novaData.getMonth() + mesesPorTrimestre);
        }
        break;

      case 'ano':
        if (direcao === 'anterior') {
          novaData.setFullYear(novaData.getFullYear() - 1);
        } else {
          novaData.setFullYear(novaData.getFullYear() + 1);
        }
        break;
    }

    // Verificar se a nova data está dentro dos limites
    if (novaData >= this.mesMinimo && novaData <= this.mesMaximo) {
      this.mesSelecionado = novaData;
      this.carregarDadosMes();
    }
  }

  // ========== MÉTODOS PARA MODAL DE DETALHES ==========

  /**
   * Obtém status formatado da parcela
   */
  obterStatusFormatado(status: StatusPagamento): string {
    switch (status) {
      case StatusPagamento.PAGO:
        return 'Pago';
      case StatusPagamento.PENDENTE:
        return 'Pendente';
      case StatusPagamento.ATRASADO:
        return 'Atrasado';
      default:
        return 'Indefinido';
    }
  }

  /**
   * Obtém tipo formatado da parcela
   */
  obterTipoFormatado(tipo: TipoParcela): string {
    switch (tipo) {
      case TipoParcela.ENTRADA:
        return 'Entrada';
      case TipoParcela.NORMAL:
        return 'Normal';
      case TipoParcela.RENEGOCIADA:
        return 'Renegociada';
      case TipoParcela.FINAL:
        return 'Final';
      default:
        return 'Normal';
    }
  }

  /**
   * Calcula dias até o vencimento (para parcelas pendentes)
   */
  calcularDiasParaVencimento(dataVencimento: Date): number {
    const hoje = new Date();
    const diffTime = dataVencimento.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtém situação da parcela (em dia, vencendo, vencida)
   */
  obterSituacaoParcela(parcela: ParcelaPrevisao): { situacao: string; classe: string; icone: string } {
    if (parcela.status === StatusPagamento.PAGO) {
      return {
        situacao: 'Pago',
        classe: 'text-success',
        icone: 'fas fa-check-circle'
      };
    }

    if (parcela.status === StatusPagamento.ATRASADO) {
      return {
        situacao: `Atrasado (${parcela.diasAtraso} dias)`,
        classe: 'text-danger',
        icone: 'fas fa-exclamation-triangle'
      };
    }

    // Para parcelas pendentes, verificar se está vencendo
    const diasParaVencimento = this.calcularDiasParaVencimento(parcela.dataVencimento);

    if (diasParaVencimento < 0) {
      return {
        situacao: `Vencido há ${Math.abs(diasParaVencimento)} dias`,
        classe: 'text-danger',
        icone: 'fas fa-exclamation-triangle'
      };
    } else if (diasParaVencimento <= 7) {
      return {
        situacao: `Vence em ${diasParaVencimento} dias`,
        classe: 'text-warning',
        icone: 'fas fa-clock'
      };
    } else {
      return {
        situacao: `Vence em ${diasParaVencimento} dias`,
        classe: 'text-info',
        icone: 'fas fa-calendar-alt'
      };
    }
  }

  /**
   * Verifica se pode realizar ações na parcela (para admins)
   */
  podeRealizarAcoes(parcela: ParcelaPrevisao): boolean {
    return this.podeEditarParcelas && parcela.status !== StatusPagamento.PAGO;
  }

  // ========== MÉTODOS DE CONTROLE DO DROPDOWN ==========

  /**
   * Alterna a visibilidade do dropdown
   */
  toggleDropdown(): void {
    if (!this.exportandoPDF && this.dadosPrevisao && this.dadosPrevisao.parcelas.length > 0) {
      this.dropdownAberto = !this.dropdownAberto;
    }
  }

  /**
   * Fecha o dropdown
   */
  fecharDropdown(): void {
    this.dropdownAberto = false;
  }

  /**
   * Fecha o dropdown se clicar fora dele
   */
  fecharDropdownSeClicouFora(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.dropdown');

    if (!dropdown && this.dropdownAberto) {
      this.fecharDropdown();
    }
  }

  /**
   * Seleciona uma opção de exportação e executa a ação
   */
  selecionarOpcaoExportacao(tipo: 'detalhado' | 'resumo'): void {
    this.fecharDropdown();

    if (tipo === 'detalhado') {
      this.exportarParcelasPDF();
    } else if (tipo === 'resumo') {
      this.exportarResumoParcelasPDF();
    }
  }

  // ========== MÉTODOS DE EXPORTAÇÃO PDF ==========





  /**
   * Exporta as parcelas do mês para PDF com design moderno
   */
  async exportarParcelasPDF(): Promise<void> {
    if (!this.dadosPrevisao || this.exportandoPDF) {
      return;
    }

    this.exportandoPDF = true;

    try {
      // Importação dinâmica do jsPDF
      const { jsPDF } = await import('jspdf');

      // Criar documento PDF em formato A4
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ========== CABEÇALHO MODERNO ==========

      // Linha superior decorativa
      doc.setFillColor(50, 50, 50);
      doc.rect(0, 0, pageWidth, 8, 'F');

      // Título principal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(30, 30, 30);
      doc.text('PREVISÃO DE RECEBIMENTOS', 20, 25);

      // Subtítulo com período
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text(this.formatarMesAno(this.mesSelecionado).toUpperCase(), 20, 35);

      // Data de geração
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const dataGeracao = new Date().toLocaleString('pt-BR');
      doc.text(`Relatório gerado em: ${dataGeracao}`, pageWidth - 20, 35, { align: 'right' });

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(20, 45, pageWidth - 20, 45);

      // ========== SEÇÃO DE RESUMO EXECUTIVO ==========

      let yPos = 58;
      const resumo = this.dadosPrevisao.resumo;

      // Título da seção
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('RESUMO EXECUTIVO', 20, yPos);
      yPos += 15;

      // Cards de resumo em layout de grid
      const cardWidth = (pageWidth - 50) / 2;
      const cardHeight = 25;

      // Card 1: Total Geral
      this.criarCardResumo(doc, 20, yPos, cardWidth, cardHeight,
        'TOTAL GERAL',
        `${resumo.totalParcelas} parcelas`,
        this.formatarMoeda(resumo.valorTotal),
        220);

      // Card 2: Pendentes
      this.criarCardResumo(doc, 20 + cardWidth + 10, yPos, cardWidth, cardHeight,
        'PENDENTES',
        `${resumo.parcelasPendentes} parcelas`,
        this.formatarMoeda(resumo.valorPendentes),
        180);

      yPos += cardHeight + 10;

      // Card 3: Atrasadas
      this.criarCardResumo(doc, 20, yPos, cardWidth, cardHeight,
        'ATRASADAS',
        `${resumo.parcelasAtrasadas} parcelas`,
        this.formatarMoeda(resumo.valorAtrasadas),
        120);

      // Card 4: Renegociadas
      this.criarCardResumo(doc, 20 + cardWidth + 10, yPos, cardWidth, cardHeight,
        'RENEGOCIADAS',
        `${resumo.parcelasRenegociadas} parcelas`,
        this.formatarMoeda(resumo.valorRenegociadas),
        150);

      yPos += cardHeight + 20;

      // ========== TABELA DE PARCELAS DETALHADA ==========

      // Título da seção
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('DETALHAMENTO DAS PARCELAS', 20, yPos);
      yPos += 15;

      // Preparar dados da tabela (larguras ajustadas para caber na página A4)
      const colunas = [
        { titulo: 'Cliente', largura: 35 },
        { titulo: 'Contrato', largura: 20 },
        { titulo: 'Parcela', largura: 15 },
        { titulo: 'Vencimento', largura: 22 },
        { titulo: 'Valor', largura: 28 },
        { titulo: 'Status', largura: 20 },
        { titulo: 'Tipo', largura: 20 }
      ];

      const linhas = this.dadosPrevisao.parcelas.map(parcela => [
        parcela.clienteNome,
        parcela.numeroContrato,
        parcela.numeroParcela.toString(),
        this.formatarData(parcela.dataVencimento),
        this.formatarMoeda(parcela.valorParcela),
        this.obterStatusFormatado(parcela.status),
        this.obterTipoFormatado(parcela.tipoParcela)
      ]);

      // Criar tabela moderna
      yPos = this.criarTabelaModerna(doc, colunas, linhas, yPos);

      // ========== RODAPÉ MODERNO ==========

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Linha superior do rodapé
        const footerY = pageHeight - 20;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(20, footerY, pageWidth - 20, footerY);

        // Informações do rodapé
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);

        // Sistema e data (esquerda)
        doc.text('EV Advocacia Criminal - Sistema de Gestão', 20, footerY + 8);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, footerY + 14);

        // Paginação (direita)
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, footerY + 8, { align: 'right' });

        // Linha inferior decorativa
        doc.setFillColor(50, 50, 50);
        doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
      }

      // Salvar o arquivo com método alternativo
      const nomeArquivo = `previsao-recebimentos-${this.mesSelecionado.getFullYear()}-${(this.mesSelecionado.getMonth() + 1).toString().padStart(2, '0')}.pdf`;

      // Método alternativo de download mais confiável
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erro ao exportar PDF das parcelas:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      this.exportandoPDF = false;
    }
  }

  /**
   * Exporta resumo executivo das parcelas para PDF (versão compacta e moderna)
   */
  async exportarResumoParcelasPDF(): Promise<void> {
    if (!this.dadosPrevisao || this.exportandoPDF) {
      return;
    }

    this.exportandoPDF = true;

    try {
      // Importação dinâmica do jsPDF
      const { jsPDF } = await import('jspdf');

      // Criar documento PDF em formato A4
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ========== CABEÇALHO EXECUTIVO ==========

      // Fundo do cabeçalho
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, 50, 'F');

      // Linha decorativa superior
      doc.setFillColor(50, 50, 50);
      doc.rect(0, 0, pageWidth, 4, 'F');

      // Título principal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(30, 30, 30);
      doc.text('RESUMO EXECUTIVO', 20, 25);

      // Subtítulo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(16);
      doc.setTextColor(80, 80, 80);
      doc.text(`Previsão de Recebimentos - ${this.formatarMesAno(this.mesSelecionado)}`, 20, 35);

      // Data e hora
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const dataGeracao = new Date().toLocaleString('pt-BR');
      doc.text(`Gerado em: ${dataGeracao}`, pageWidth - 20, 42, { align: 'right' });

      // ========== DASHBOARD DE INDICADORES ==========

      const resumo = this.dadosPrevisao.resumo;
      let yPos = 65;

      // Card principal - Total Geral
      this.criarCardPrincipal(doc, 20, yPos, pageWidth - 40, 35,
        'VALOR TOTAL PREVISTO',
        this.formatarMoeda(resumo.valorTotal),
        `${resumo.totalParcelas} parcelas no período`);

      yPos += 50;

      // Grid de indicadores (2x2)
      const cardWidth = (pageWidth - 50) / 2;
      const cardHeight = 40;

      // Linha 1
      this.criarCardIndicador(doc, 20, yPos, cardWidth, cardHeight,
        'PENDENTES', resumo.parcelasPendentes, resumo.valorPendentes,
        this.calcularPercentualTipo('pendentes'), 200);

      this.criarCardIndicador(doc, 20 + cardWidth + 10, yPos, cardWidth, cardHeight,
        'ATRASADAS', resumo.parcelasAtrasadas, resumo.valorAtrasadas,
        this.calcularPercentualTipo('atrasadas'), 140);

      yPos += cardHeight + 10;

      // Linha 2
      this.criarCardIndicador(doc, 20, yPos, cardWidth, cardHeight,
        'RENEGOCIADAS', resumo.parcelasRenegociadas, resumo.valorRenegociadas,
        this.calcularPercentualTipo('renegociadas'), 170);

      this.criarCardIndicador(doc, 20 + cardWidth + 10, yPos, cardWidth, cardHeight,
        'NORMAIS', resumo.parcelasNormais, resumo.valorNormais,
        this.calcularPercentualTipo('normais'), 220);

      yPos += cardHeight + 30;

      // Verificar se há espaço suficiente para a seção de análise (precisa de ~70mm)
      if (yPos + 70 > pageHeight - 40) {
        doc.addPage();
        yPos = 30;
      }



      // ========== RODAPÉ EXECUTIVO ==========

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        const footerY = pageHeight - 25;

        // Linha separadora
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        doc.line(20, footerY, pageWidth - 20, footerY);

        // Informações do sistema
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text('EV ADVOCACIA CRIMINAL', 20, footerY + 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Sistema de Gestão Financeira', 20, footerY + 14);
        doc.text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 20, footerY + 8, { align: 'right' });

        // Paginação (se houver mais de uma página)
        if (pageCount > 1) {
          doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, footerY + 14, { align: 'right' });
        } else {
          doc.text('Documento confidencial', pageWidth - 20, footerY + 14, { align: 'right' });
        }

        // Barra inferior
        doc.setFillColor(50, 50, 50);
        doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
      }

      // Salvar o arquivo com método alternativo
      const nomeArquivo = `resumo-previsao-${this.mesSelecionado.getFullYear()}-${(this.mesSelecionado.getMonth() + 1).toString().padStart(2, '0')}.pdf`;

      // Método alternativo de download mais confiável
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erro ao exportar PDF do resumo:', error);
      alert('Erro ao gerar PDF do resumo. Tente novamente.');
    } finally {
      this.exportandoPDF = false;
    }
  }

  // ========== MÉTODOS UTILITÁRIOS PARA EXPORTAÇÃO ==========

  /**
   * Formata valor monetário para exibição
   */
  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  /**
   * Formata data para exibição
   */
  private formatarData(data: Date): string {
    return new Intl.DateTimeFormat('pt-BR').format(data);
  }

  /**
   * Cria um card de resumo moderno no PDF
   */
  private criarCardResumo(doc: any, x: number, y: number, width: number, height: number,
    titulo: string, subtitulo: string, valor: string, corCinza: number): void {
    // Fundo do card com gradiente simulado
    doc.setFillColor(corCinza, corCinza, corCinza);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');

    // Borda sutil
    doc.setDrawColor(corCinza - 30, corCinza - 30, corCinza - 30);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, width, height, 2, 2, 'S');

    // Título do card
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(titulo, x + 5, y + 8);

    // Subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(subtitulo, x + 5, y + 14);

    // Valor principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(valor, x + width - 5, y + 18, { align: 'right' });
  }

  /**
   * Cria uma tabela moderna no PDF
   */
  private criarTabelaModerna(doc: any, colunas: any[], linhas: string[][], startY: number): number {
    let yPos = startY;
    const lineHeight = 8;
    const headerHeight = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cabeçalho da tabela
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos, pageWidth - 40, headerHeight, 'F');

    // Borda do cabeçalho
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(20, yPos, pageWidth - 40, headerHeight, 'S');

    // Títulos das colunas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    let xPos = 22;
    colunas.forEach(coluna => {
      doc.text(coluna.titulo, xPos, yPos + 8);
      xPos += coluna.largura;
    });

    yPos += headerHeight;

    // Linhas da tabela
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);

    linhas.forEach((linha, index) => {
      // Verificar se precisa de nova página (deixar espaço suficiente para rodapé)
      if (yPos + lineHeight > pageHeight - 50) {
        doc.addPage();
        yPos = 30;

        // Repetir cabeçalho na nova página
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPos, pageWidth - 40, headerHeight, 'F');
        doc.setDrawColor(180, 180, 180);
        doc.rect(20, yPos, pageWidth - 40, headerHeight, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);

        let xPosHeader = 22;
        colunas.forEach(coluna => {
          doc.text(coluna.titulo, xPosHeader, yPos + 8);
          xPosHeader += coluna.largura;
        });

        yPos += headerHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
      }

      // Fundo alternado para linhas
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, yPos, pageWidth - 40, lineHeight, 'F');
      }

      // Dados da linha
      xPos = 22;
      linha.forEach((celula, colIndex) => {
        // Truncamento inteligente baseado na largura da coluna
        let maxChars: number;
        switch (colIndex) {
          case 0: maxChars = 18; break; // Cliente
          case 1: maxChars = 12; break; // Contrato
          case 2: maxChars = 8; break;  // Parcela
          case 3: maxChars = 10; break; // Vencimento
          case 4: maxChars = 15; break; // Valor
          case 5: maxChars = 12; break; // Status
          case 6: maxChars = 12; break; // Tipo
          default: maxChars = 15;
        }

        const textoTruncado = celula.length > maxChars ? celula.substring(0, maxChars - 3) + '...' : celula;

        // Destacar valores monetários
        if (colIndex === 4) { // Coluna de valor
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
        }

        doc.text(textoTruncado, xPos, yPos + 6);
        xPos += colunas[colIndex].largura;
      });

      // Linha separadora sutil
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.line(20, yPos + lineHeight, pageWidth - 20, yPos + lineHeight);

      yPos += lineHeight;
    });

    // Borda final da tabela
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);

    return yPos + 10;
  }

  /**
   * Cria um card principal destacado no PDF
   */
  private criarCardPrincipal(doc: any, x: number, y: number, width: number, height: number,
    titulo: string, valorPrincipal: string, subtitulo: string): void {
    // Fundo com gradiente simulado
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(x, y, width, height, 4, 4, 'F');

    // Borda elegante
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, width, height, 4, 4, 'S');

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(titulo, x + width / 2, y + 12, { align: 'center' });

    // Valor principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text(valorPrincipal, x + width / 2, y + 24, { align: 'center' });

    // Subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(subtitulo, x + width / 2, y + 32, { align: 'center' });
  }

  /**
   * Cria um card de indicador no PDF
   */
  private criarCardIndicador(doc: any, x: number, y: number, width: number, height: number,
    titulo: string, quantidade: number, valor: number, percentual: number, corCinza: number): void {
    // Fundo do card
    doc.setFillColor(corCinza, corCinza, corCinza);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');

    // Borda sutil
    doc.setDrawColor(corCinza - 40, corCinza - 40, corCinza - 40);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, 3, 3, 'S');

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(titulo, x + 8, y + 12);

    // Quantidade
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text(quantidade.toString(), x + width - 8, y + 12, { align: 'right' });

    // Valor
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(this.formatarMoeda(valor), x + 8, y + 24);

    // Percentual
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`${percentual.toFixed(1)}%`, x + width - 8, y + 24, { align: 'right' });

    // Barra de progresso visual
    const barWidth = width - 16;
    const barHeight = 3;
    const barY = y + height - 8;

    // Fundo da barra
    doc.setFillColor(220, 220, 220);
    doc.rect(x + 8, barY, barWidth, barHeight, 'F');

    // Preenchimento da barra baseado no percentual
    const fillWidth = (barWidth * percentual) / 100;
    doc.setFillColor(corCinza - 60, corCinza - 60, corCinza - 60);
    doc.rect(x + 8, barY, fillWidth, barHeight, 'F');
  }

  /**
   * Cria tabela simples quando autoTable não está disponível
   */
  private criarTabelaSimples(doc: any, colunas: string[], linhas: string[][], startY: number): void {
    let yPos = startY;
    const lineHeight = 6;
    const colWidths = [40, 25, 15, 25, 25, 20, 20]; // Larguras das colunas
    let xPos = 20;

    // Cabeçalho
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');

    colunas.forEach((coluna, index) => {
      doc.text(coluna, xPos, yPos);
      xPos += colWidths[index];
    });

    yPos += lineHeight + 2;

    // Linha separadora
    doc.line(20, yPos, 190, yPos);
    yPos += 4;

    // Dados
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    linhas.forEach(linha => {
      xPos = 20;
      linha.forEach((celula, index) => {
        // Truncar texto se muito longo
        const textoTruncado = celula.length > 15 ? celula.substring(0, 12) + '...' : celula;
        doc.text(textoTruncado, xPos, yPos);
        xPos += colWidths[index];
      });
      yPos += lineHeight;

      // Nova página se necessário (deixar espaço para rodapé)
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
    });
  }
}
