import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, BehaviorSubject, combineLatest } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { RelatorioService } from '../../services/relatorio.service';
import { AcessoControleService } from '../../services/acesso-controle.service';
import { RelatorioPerformanceService, PerformanceMetrics } from '../../services/relatorio-performance.service';
import { LazyLoadDirective } from '../../directives/lazy-load.directive';
import { User, UserRole } from '../../models/user.model';
import {
  DadosRelatorio,
  FiltrosRelatorio,
  MetricasGerais,
  ContratoResumo
} from '../../models/relatorio.model';
import { FiltrosRelatorioComponent } from './filtros/filtros-relatorio.component';
import { ExportacaoRelatorioComponent } from './exportacao/exportacao-relatorio.component';
import { GraficoReceitaComponent } from './graficos/grafico-receita.component';
import { GraficoStatusComponent } from './graficos/grafico-status.component';
import { GraficoInadimplenciaComponent } from './graficos/grafico-inadimplencia.component';
import { GraficoEvolucaoClienteComponent } from './graficos/grafico-evolucao-cliente.component';

@Component({
  selector: 'app-relatorio-consulta-geral',
  standalone: true,
  imports: [
    CommonModule,
    FiltrosRelatorioComponent,
    ExportacaoRelatorioComponent,
    GraficoReceitaComponent,
    GraficoStatusComponent,
    GraficoInadimplenciaComponent,
    GraficoEvolucaoClienteComponent,
    LazyLoadDirective
  ],
  templateUrl: './relatorio-consulta-geral.component.html',
  styleUrls: [
    './relatorio-consulta-geral.component.scss',
    './relatorio-1366x768.scss'
  ]
})
export class RelatorioConsultaGeralComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private authService = inject(AuthService);
  private relatorioService = inject(RelatorioService);
  private acessoControleService = inject(AcessoControleService);
  private performanceService = inject(RelatorioPerformanceService);

  // Estado do componente
  usuarioAtual: User | null = null;
  dadosConsolidados: DadosRelatorio | null = null;
  filtrosAtivos: FiltrosRelatorio = {};
  carregando: boolean = false;
  erro: string | null = null;

  // Performance e otimizações
  performanceMetrics: PerformanceMetrics | null = null;
  contratosPaginados: ContratoResumo[] = [];
  paginaAtual: number = 1;
  itensPorPagina: number = 25;
  totalContratos: number = 0;
  graficosCarregados = new Set<string>();

  // Subjects para reatividade
  private filtrosSubject = new BehaviorSubject<FiltrosRelatorio>({});
  filtros$ = this.filtrosSubject.asObservable();

  // Cache de permissões para evitar verificações repetidas
  private permissoesCache = {
    isAdmin: false,
    podeVerTodosClientes: false,
    podeVerMetricasConsolidadas: false,
    podeExportar: false,
    podeVerGraficosFinanceiros: false,
    podeVerGraficosComparativos: false,
    cacheValido: false
  };

  // Propriedades computadas
  get isAdmin(): boolean {
    this.atualizarCachePermissoes();
    return this.permissoesCache.isAdmin;
  }

  get hasData(): boolean {
    return this.dadosConsolidados !== null;
  }

  get podeVerTodosClientes(): boolean {
    this.atualizarCachePermissoes();
    return this.permissoesCache.podeVerTodosClientes;
  }

  get podeVerMetricasConsolidadas(): boolean {
    this.atualizarCachePermissoes();
    return this.permissoesCache.podeVerMetricasConsolidadas;
  }

  get podeExportar(): boolean {
    this.atualizarCachePermissoes();
    return this.permissoesCache.podeExportar;
  }

  get metricas(): MetricasGerais | null {
    this.atualizarCachePermissoes();

    // Verificar se pode ver métricas antes de retornar
    if (!this.permissoesCache.podeVerMetricasConsolidadas && !this.permissoesCache.isAdmin) {
      // Usuários comuns podem ver suas próprias métricas básicas
      const metricasBasicas = this.dadosConsolidados?.metricas;
      if (metricasBasicas && !this.permissoesCache.isAdmin) {
        // Filtrar métricas sensíveis para usuários comuns
        return {
          ...metricasBasicas,
          // Manter apenas métricas do próprio usuário
          numeroContratosAtivos: metricasBasicas.numeroContratosAtivos,
          totalRecebido: metricasBasicas.totalRecebido,
          totalPendente: metricasBasicas.totalPendente,
          totalAtrasado: metricasBasicas.totalAtrasado,
          // Ocultar métricas consolidadas
          taxaInadimplencia: 0,
          ticketMedio: 0,
          tempoMedioPagamento: 0
        };
      }
    }
    return this.dadosConsolidados?.metricas || null;
  }

  // Propriedades para dados dos gráficos
  get dadosGraficos() {
    // Verificar se pode ver gráficos consolidados usando cache
    this.atualizarCachePermissoes();
    if (!this.permissoesCache.podeVerTodosClientes && !this.permissoesCache.isAdmin) {
      // Usuários comuns veem apenas seus próprios dados nos gráficos
      return this.dadosConsolidados?.dadosGraficos || null;
    }
    return this.dadosConsolidados?.dadosGraficos || null;
  }

  get dadosReceitaMensal() {
    this.atualizarCachePermissoes();
    if (!this.permissoesCache.podeVerGraficosFinanceiros) {
      return [];
    }
    return this.dadosGraficos?.receitaMensal || [];
  }

  get distribuicaoStatus() {
    return this.dadosGraficos?.distribuicaoStatus || null;
  }

  get dadosInadimplencia() {
    // Converter DadosMensais para DadosInadimplencia
    const evolucao = this.dadosGraficos?.evolucaoInadimplencia || [];
    return evolucao.map(item => ({
      mes: item.mes,
      ano: item.ano,
      taxa: item.valor, // Assumindo que o valor representa a taxa
      totalParcelas: 100, // Valor padrão - deve ser calculado pelo serviço
      parcelasAtrasadas: Math.round(item.valor), // Aproximação
      criticidade: item.valor > 15 ? 'alta' as const : item.valor > 5 ? 'media' as const : 'baixa' as const
    }));
  }

  get dadosEvolucaoCliente() {
    return this.dadosGraficos?.evolucaoCliente || null;
  }

  ngOnInit(): void {
    this.inicializarComponente();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Atualiza cache de permissões para evitar verificações repetidas
   */
  private atualizarCachePermissoes(): void {
    if (this.permissoesCache.cacheValido) {
      return; // Cache ainda válido
    }

    this.permissoesCache.isAdmin = this.acessoControleService.isAdmin();
    this.permissoesCache.podeVerTodosClientes = this.acessoControleService.podeAcessarTodosClientes();
    this.permissoesCache.podeVerMetricasConsolidadas = this.acessoControleService.podeVerDadosFinanceirosConsolidados();
    this.permissoesCache.podeExportar = this.acessoControleService.podeExportarRelatorios();
    this.permissoesCache.podeVerGraficosFinanceiros = this.acessoControleService.podeVerDadosFinanceirosConsolidados();
    this.permissoesCache.podeVerGraficosComparativos = this.acessoControleService.podeVerMetricasComparativas();
    this.permissoesCache.cacheValido = true;

    // Invalidar cache após 30 segundos
    setTimeout(() => {
      this.permissoesCache.cacheValido = false;
    }, 30000);
  }

  /**
   * Inicializa o componente configurando observables e carregando dados iniciais
   */
  private inicializarComponente(): void {
    // Observar mudanças no usuário atual
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.usuarioAtual = user;
        // Invalidar cache de permissões quando usuário mudar
        this.permissoesCache.cacheValido = false;
        if (user) {
          this.carregarDadosIniciais();
        }
      });

    // Observar mudanças nos filtros e recarregar dados
    combineLatest([
      this.authService.currentUser$,
      this.filtros$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([user, filtros]) => {
        if (user && Object.keys(filtros).length > 0) {
          this.carregarDadosComFiltros(filtros);
        }
      });
  }

  /**
   * Carrega dados iniciais baseado no tipo de usuário
   */
  private carregarDadosIniciais(): void {
    if (!this.usuarioAtual) return;

    this.carregando = true;
    this.erro = null;

    if (this.isAdmin) {
      this.carregarDadosAdmin();
    } else {
      this.carregarDadosCliente(this.usuarioAtual.email);
    }
  }

  /**
   * Carrega dados para usuário administrador (todos os contratos)
   */
  private carregarDadosAdmin(): void {
    // Verificar se realmente tem permissão de admin
    if (!this.permissoesCache.podeVerTodosClientes) {
      this.tratarErro('Acesso negado - permissões insuficientes', new Error('Não é administrador'));
      return;
    }

    this.relatorioService.obterDadosRelatorio(this.filtrosAtivos)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dados) => {
          this.dadosConsolidados = dados;
          this.carregando = false;
          this.erro = null;

          // Configurar otimizações baseadas nos dados carregados
          this.configurarOtimizacoes();
          this.atualizarContratosPaginados();
          this.obterMetricasPerformance();
        },
        error: (error) => {
          this.tratarErro('Erro ao carregar dados do relatório', error);
        }
      });
  }

  /**
   * Carrega dados para usuário comum (apenas seus contratos)
   */
  private carregarDadosCliente(emailUsuario: string): void {
    // Verificar se o usuário tem permissão para acessar seus próprios dados
    if (!this.acessoControleService.podeAcessarDadosCliente(emailUsuario)) {
      this.tratarErro('Acesso negado aos dados solicitados', new Error('Permissão insuficiente'));
      return;
    }

    // Verificar se pode acessar o período solicitado
    if (!this.acessoControleService.podeAcessarDadosPeriodo(this.filtrosAtivos.dataInicio, this.filtrosAtivos.dataFim)) {
      this.tratarErro('Período de consulta não autorizado', new Error('Período muito antigo'));
      return;
    }

    // Aplicar filtros de segurança
    const filtrosSeguro = this.acessoControleService.aplicarFiltrosSeguranca(this.filtrosAtivos);
    if (!filtrosSeguro) {
      this.tratarErro('Erro na aplicação de filtros de segurança', new Error('Filtros inválidos'));
      return;
    }

    this.relatorioService.obterDadosRelatorio(filtrosSeguro, emailUsuario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dados) => {
          this.dadosConsolidados = dados;
          this.carregando = false;
          this.erro = null;

          // Configurar otimizações baseadas nos dados carregados
          this.configurarOtimizacoes();
          this.atualizarContratosPaginados();
          this.obterMetricasPerformance();
        },
        error: (error) => {
          this.tratarErro('Erro ao carregar seus dados', error);
        }
      });
  }

  /**
   * Carrega dados aplicando filtros específicos
   */
  private carregarDadosComFiltros(filtros: FiltrosRelatorio): void {
    if (!this.usuarioAtual) return;

    this.carregando = true;
    this.erro = null;

    // Aplicar filtros de segurança antes de usar
    const filtrosSeguro = this.acessoControleService.aplicarFiltrosSeguranca(filtros);
    if (!filtrosSeguro) {
      this.tratarErro('Erro na aplicação de filtros de segurança', new Error('Filtros inválidos'));
      return;
    }

    this.filtrosAtivos = { ...filtrosSeguro };

    // Verificar se pode acessar o período solicitado
    if (!this.acessoControleService.podeAcessarDadosPeriodo(filtrosSeguro.dataInicio, filtrosSeguro.dataFim)) {
      this.tratarErro('Período de consulta não autorizado', new Error('Período muito antigo'));
      return;
    }

    const usuarioId = this.acessoControleService.getUsuarioIdParaFiltro();

    this.relatorioService.obterDadosRelatorio(filtrosSeguro, usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dados) => {
          this.dadosConsolidados = dados;
          this.carregando = false;
          this.erro = null;

          // Configurar otimizações baseadas nos dados carregados
          this.configurarOtimizacoes();
          this.atualizarContratosPaginados();
          this.obterMetricasPerformance();
        },
        error: (error) => {
          this.tratarErro('Erro ao aplicar filtros', error);
        }
      });
  }

  /**
   * Manipula mudanças nos filtros vindas do componente de filtros
   * O debounce já é implementado no componente de filtros
   */
  onFiltrosChange(novosFiltros: FiltrosRelatorio): void {
    this.filtrosSubject.next(novosFiltros);
  }



  /**
   * Trata erros de forma centralizada
   */
  private tratarErro(mensagem: string, error: any): void {
    console.error(mensagem, error);
    this.erro = mensagem;
    this.carregando = false;

    // Log detalhado para debugging
    if (error?.message) {
      console.error('Detalhes do erro:', error.message);
    }
  }

  /**
   * Obtém mensagem de restrição baseada no contexto
   */
  getMensagemRestricao(contexto: string): string {
    return this.acessoControleService.getMensagemRestricao(contexto);
  }

  /**
   * Verifica se uma funcionalidade específica está disponível (com cache)
   */
  temFuncionalidade(funcionalidade: string): boolean {
    // Para funcionalidades específicas, usar verificações diretas com cache
    switch (funcionalidade) {
      case 'ver_graficos_comparativos':
        return this.podeVerGraficosComparativos;
      case 'ver_metricas_consolidadas':
        return this.podeVerMetricasConsolidadas;
      case 'ver_dados_todos_clientes':
        return this.podeVerTodosClientes;
      default:
        // Para outras funcionalidades, fazer verificação direta (sem log de auditoria)
        return this.acessoControleService.temFuncionalidade(funcionalidade);
    }
  }

  /**
   * Retorna mensagem personalizada baseada no estado atual
   */
  getMensagemEstado(): string {
    if (this.carregando) {
      return 'Carregando dados do relatório...';
    }

    if (this.erro) {
      return this.erro;
    }

    if (!this.hasData) {
      return 'Nenhum dado encontrado para os filtros aplicados.';
    }

    return '';
  }

  /**
   * Verifica se deve mostrar indicador de carregamento
   */
  mostrarCarregamento(): boolean {
    return this.carregando;
  }

  /**
   * Verifica se deve mostrar mensagem de erro
   */
  mostrarErro(): boolean {
    return !this.carregando && this.erro !== null;
  }

  /**
   * Verifica se deve mostrar conteúdo principal
   */
  mostrarConteudo(): boolean {
    return !this.carregando && !this.erro && this.hasData;
  }

  /**
   * Verifica se deve mostrar mensagem de dados vazios
   */
  mostrarDadosVazios(): boolean {
    return !this.carregando && !this.erro && !this.hasData;
  }

  /**
   * Manipula a conclusão da exportação
   */
  onExportacaoConcluida(): void {
    // Pode implementar feedback visual ou log da exportação
    console.log('Exportação concluída com sucesso');

    // Opcional: mostrar toast de sucesso
    // this.toastService.success('Relatório exportado com sucesso!');
  }

  /**
   * Métodos de otimização de performance
   */

  /**
   * Configura otimizações baseadas no tamanho dos dados
   */
  private configurarOtimizacoes(): void {
    const totalItens = this.dadosConsolidados?.listaContratos?.length || 0;

    // Configurar otimizações baseadas no volume de dados
    this.performanceService.configure({
      enableVirtualScrolling: totalItens > 100,
      enableLazyLoading: totalItens > 50,
      enablePagination: totalItens > 25,
      pageSize: totalItens > 100 ? 50 : 25,
      lazyLoadThreshold: 200,
      debounceTime: totalItens > 500 ? 500 : 300
    });
  }

  /**
   * Carrega gráfico de forma lazy quando se torna visível
   */
  onGraficoVisible(graficoId: string): void {
    if (!this.graficosCarregados.has(graficoId)) {
      console.log(`Carregando gráfico: ${graficoId}`);
      this.graficosCarregados.add(graficoId);

      // Aqui você pode implementar lógica específica para cada gráfico
      // Por exemplo, carregar dados específicos ou inicializar bibliotecas de gráficos
    }
  }

  /**
   * Manipula mudança de página na lista de contratos
   */
  onPaginaChange(novaPagina: number): void {
    this.paginaAtual = novaPagina;
    this.atualizarContratosPaginados();
  }

  /**
   * Manipula mudança no tamanho da página
   */
  onTamanhoPaginaChange(novoTamanho: number): void {
    this.itensPorPagina = novoTamanho;
    this.paginaAtual = 1; // Reset para primeira página
    this.atualizarContratosPaginados();
  }

  /**
   * Atualiza lista paginada de contratos
   */
  private atualizarContratosPaginados(): void {
    if (!this.dadosConsolidados?.listaContratos) {
      this.contratosPaginados = [];
      return;
    }

    const startIndex = (this.paginaAtual - 1) * this.itensPorPagina;
    const endIndex = startIndex + this.itensPorPagina;

    this.contratosPaginados = this.dadosConsolidados.listaContratos.slice(startIndex, endIndex);
    this.totalContratos = this.dadosConsolidados.listaContratos.length;
  }

  /**
   * Força carregamento de todos os gráficos (para exportação)
   */
  precarregarTodosGraficos(): void {
    const graficos = ['receita', 'status', 'inadimplencia', 'evolucao'];
    graficos.forEach(grafico => {
      if (!this.graficosCarregados.has(grafico)) {
        this.onGraficoVisible(grafico);
      }
    });
  }

  /**
   * Obtém métricas de performance atuais
   */
  obterMetricasPerformance(): void {
    this.performanceService.getCurrentMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        this.performanceMetrics = metrics;
      });
  }

  /**
   * Verifica se deve usar virtual scrolling
   */
  get deveUsarVirtualScrolling(): boolean {
    return this.totalContratos > 100;
  }

  /**
   * Verifica se deve usar paginação
   */
  get deveUsarPaginacao(): boolean {
    return this.totalContratos > 25 && !this.deveUsarVirtualScrolling;
  }

  /**
   * Obtém altura estimada para virtual scrolling
   */
  get alturaItemVirtual(): number {
    return 80; // pixels por item na lista
  }

  /**
   * Obtém altura do container para virtual scrolling
   */
  get alturaContainerVirtual(): number {
    return 600; // altura máxima do container
  }

  /**
   * Métodos auxiliares para o template
   */

  /**
   * TrackBy function para otimizar renderização da lista
   */
  trackByContratoId(index: number, contrato: ContratoResumo): string {
    return contrato.clienteId + '_' + contrato.numeroContrato;
  }

  /**
   * Obtém classe CSS para badge de status
   */
  getBadgeClass(status: ContratoResumo['statusGeral']): string {
    switch (status) {
      case 'em_dia':
        return 'bg-success';
      case 'atrasado':
        return 'bg-danger';
      case 'quitado':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * Obtém label para status
   */
  getStatusLabel(status: ContratoResumo['statusGeral']): string {
    switch (status) {
      case 'em_dia':
        return 'Em Dia';
      case 'atrasado':
        return 'Atrasado';
      case 'quitado':
        return 'Quitado';
      default:
        return 'Indefinido';
    }
  }

  /**
   * Manipula mudanças no virtual scroll
   */
  onVirtualScrollChange(event: { startIndex: number; endIndex: number; scrollTop: number }): void {
    // Atualizar itens visíveis baseado no scroll
    if (this.dadosConsolidados?.listaContratos) {
      this.contratosPaginados = this.dadosConsolidados.listaContratos.slice(
        event.startIndex,
        event.endIndex
      );
    }
  }

  /**
   * Obtém páginas para paginação
   */
  getPaginationPages(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.paginaAtual;
    const pages: number[] = [];

    // Mostrar no máximo 5 páginas
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    // Ajustar se não há páginas suficientes no final
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Obtém total de páginas
   */
  getTotalPages(): number {
    return Math.ceil(this.totalContratos / this.itensPorPagina);
  }

  /**
   * Verifica se o usuário pode ver gráficos financeiros
   */
  get podeVerGraficosFinanceiros(): boolean {
    this.atualizarCachePermissoes();
    return this.permissoesCache.podeVerGraficosFinanceiros;
  }

  /**
   * Verifica se o usuário pode ver gráficos comparativos
   */
  get podeVerGraficosComparativos(): boolean {
    this.atualizarCachePermissoes();
    return this.permissoesCache.podeVerGraficosComparativos;
  }

  /**
   * Verifica se o usuário pode realizar uma ação específica (com cache limitado)
   */
  podeRealizarAcao(acao: string): boolean {
    // Para ações específicas que não estão no cache, fazer verificação direta
    // mas com menos frequência
    return this.acessoControleService.podeRealizarAcao(acao);
  }

  /**
   * Referência ao Math para uso no template
   */
  Math = Math;
}
