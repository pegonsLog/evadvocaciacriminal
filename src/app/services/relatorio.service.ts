import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { ClienteService } from './cliente.service';
import { ParcelaService } from './parcela.service';
import { RelatorioCacheService } from './relatorio-cache.service';
import {
  DadosRelatorio,
  MetricasGerais,
  FiltrosRelatorio,
  DadosGraficos,
  ContratoResumo,
  AlertaInadimplencia,
  DadosMensais,
  DistribuicaoStatus,
  TopCliente,
  StatusPagamento,
  DadosEvolucaoCliente,
  PagamentoHistorico,
  ProjecaoFutura,
  MetricasCliente,
  PrevisaoRecebimentosMes,
  ParcelaPrevisao,
  ResumoPrevisaoMes,
  TipoParcela,
  StatusPrevisao
} from '../models/relatorio.model';
import { Cliente, Parcela } from '../models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class RelatorioService {
  private clienteService = inject(ClienteService);
  private parcelaService = inject(ParcelaService);
  private cacheService = inject(RelatorioCacheService);

  /**
   * Obtém dados consolidados do relatório baseados nos filtros aplicados
   */
  obterDadosRelatorio(filtros: FiltrosRelatorio, usuarioId?: string): Observable<DadosRelatorio> {
    // Usar cache para otimizar performance
    return this.cacheService.getDadosRelatorio(
      filtros,
      usuarioId,
      () => this.obterDadosRelatorioSemCache(filtros, usuarioId)
    );
  }

  /**
   * Obtém dados do relatório sem usar cache (método interno)
   */
  private obterDadosRelatorioSemCache(filtros: FiltrosRelatorio, usuarioId?: string): Observable<DadosRelatorio> {
    return combineLatest([
      this.clienteService.getClientes(),
      this.parcelaService.getParcelas()
    ]).pipe(
      map(([clientes, parcelas]) => {
        // Filtrar dados baseado no usuário (se não for admin)
        let clientesFiltrados = clientes;
        let parcelasFiltradas = parcelas;
        const isUsuarioComum = !!usuarioId;

        if (usuarioId) {
          // Para usuários comuns, filtrar apenas seus próprios dados
          // Assumindo que o email do usuário corresponde ao email do cliente
          clientesFiltrados = clientes.filter(cliente => cliente.email === usuarioId);
          const clienteIds = clientesFiltrados.map(c => c.id);
          parcelasFiltradas = parcelas.filter(parcela => clienteIds.includes(parcela.clienteId));
        }

        // Aplicar filtros adicionais
        const dadosFiltrados = this.aplicarFiltros(clientesFiltrados, parcelasFiltradas, filtros);

        // Calcular métricas
        const metricas = this.calcularMetricas(dadosFiltrados.clientes, dadosFiltrados.parcelas);

        // Preparar dados para gráficos
        const dadosGraficos = this.prepararDadosGraficos(dadosFiltrados.clientes, dadosFiltrados.parcelas);

        // Gerar lista de contratos resumida
        const listaContratos = this.gerarListaContratos(dadosFiltrados.clientes, dadosFiltrados.parcelas);

        // Identificar alertas
        const alertas = this.identificarAlertas(dadosFiltrados.parcelas);

        // Aplicar mascaramento de dados para usuários comuns
        const dadosProcessados = isUsuarioComum
          ? this.aplicarMascaramentoDados({
            metricas,
            dadosGraficos,
            listaContratos,
            alertas
          })
          : {
            metricas,
            dadosGraficos,
            listaContratos,
            alertas
          };

        return dadosProcessados as DadosRelatorio;
      })
    );
  }

  /**
   * Calcula métricas financeiras consolidadas
   */
  calcularMetricas(clientes: Cliente[], parcelas: Parcela[]): MetricasGerais {
    const parcelasPagas = parcelas.filter(p => p.status === 'pago');
    const parcelasPendentes = parcelas.filter(p => p.status === 'pendente');
    const parcelasAtrasadas = parcelas.filter(p => p.status === 'atrasado');

    // Total recebido
    const totalRecebido = parcelasPagas.reduce((sum, p) => sum + (p.valorPago || 0), 0);

    // Total pendente
    const totalPendente = parcelasPendentes.reduce((sum, p) => sum + p.valorParcela, 0);

    // Total atrasado
    const totalAtrasado = parcelasAtrasadas.reduce((sum, p) => sum + p.valorParcela, 0);

    // Taxa de inadimplência
    const totalParcelas = parcelas.length;
    const taxaInadimplencia = totalParcelas > 0 ? (parcelasAtrasadas.length / totalParcelas) * 100 : 0;

    // Número de contratos ativos (clientes com parcelas pendentes ou atrasadas)
    const clientesComParcelasAbertas = new Set(
      parcelas
        .filter(p => p.status !== 'pago')
        .map(p => p.clienteId)
    );
    const numeroContratosAtivos = clientesComParcelasAbertas.size;

    // Ticket médio por cliente
    const ticketMedio = clientes.length > 0
      ? clientes.reduce((sum, c) => sum + c.contrato.valorTotal, 0) / clientes.length
      : 0;

    // Tempo médio de pagamento (em dias)
    const pagamentosComAtraso = parcelasPagas.filter(p => p.diasAtraso !== undefined);
    const tempoMedioPagamento = pagamentosComAtraso.length > 0
      ? pagamentosComAtraso.reduce((sum, p) => sum + (p.diasAtraso || 0), 0) / pagamentosComAtraso.length
      : 0;

    return {
      totalRecebido,
      totalPendente,
      totalAtrasado,
      taxaInadimplencia,
      numeroContratosAtivos,
      ticketMedio,
      tempoMedioPagamento
    };
  }

  /**
   * Prepara dados para visualização em gráficos
   */
  prepararDadosGraficos(clientes: Cliente[], parcelas: Parcela[]): DadosGraficos {
    // Receita mensal
    const receitaMensal = this.calcularReceitaMensal(parcelas);

    // Distribuição de status
    const distribuicaoStatus = this.calcularDistribuicaoStatus(parcelas);

    // Evolução da inadimplência
    const evolucaoInadimplencia = this.calcularEvolucaoInadimplencia(parcelas);

    // Top clientes por receita
    const topClientesReceita = this.calcularTopClientesReceita(clientes);

    // Evolução do cliente (apenas para usuários não-admin)
    const evolucaoCliente = clientes.length === 1
      ? this.calcularEvolucaoCliente(clientes[0], parcelas)
      : undefined;

    return {
      receitaMensal,
      distribuicaoStatus,
      evolucaoInadimplencia,
      topClientesReceita,
      evolucaoCliente
    };
  }

  /**
   * Identifica alertas de inadimplência e cobrança
   */
  identificarAlertas(parcelas: Parcela[]): AlertaInadimplencia[] {
    const alertas: AlertaInadimplencia[] = [];
    const hoje = new Date();

    parcelas.forEach(parcela => {
      // Parcelas vencidas (atrasadas)
      if (parcela.status === 'atrasado') {
        let tipo: AlertaInadimplencia['tipo'] = 'atraso_moderado';

        if (parcela.diasAtraso > 60) {
          tipo = 'atraso_critico';
        }

        alertas.push({
          clienteId: parcela.clienteId,
          clienteNome: parcela.clienteNome,
          numeroContrato: parcela.numeroContrato,
          diasAtraso: parcela.diasAtraso,
          valorEmAtraso: parcela.valorParcela,
          tipo
        });
      }

      // Parcelas com vencimento próximo (próximos 7 dias)
      if (parcela.status === 'pendente') {
        const diasParaVencimento = Math.ceil(
          (parcela.dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diasParaVencimento <= 7 && diasParaVencimento >= 0) {
          alertas.push({
            clienteId: parcela.clienteId,
            clienteNome: parcela.clienteNome,
            numeroContrato: parcela.numeroContrato,
            diasAtraso: 0,
            valorEmAtraso: 0,
            proximoVencimento: parcela.dataVencimento,
            tipo: 'vencimento_proximo'
          });
        }
      }
    });

    // Ordenar por criticidade e dias de atraso
    return alertas.sort((a, b) => {
      const ordemTipo = { 'atraso_critico': 3, 'atraso_moderado': 2, 'vencimento_proximo': 1 };
      if (ordemTipo[a.tipo] !== ordemTipo[b.tipo]) {
        return ordemTipo[b.tipo] - ordemTipo[a.tipo];
      }
      return b.diasAtraso - a.diasAtraso;
    });
  }

  /**
   * Aplica filtros aos dados
   */
  private aplicarFiltros(
    clientes: Cliente[],
    parcelas: Parcela[],
    filtros: FiltrosRelatorio
  ): { clientes: Cliente[], parcelas: Parcela[] } {
    let clientesFiltrados = [...clientes];
    let parcelasFiltradas = [...parcelas];

    // Filtro por cliente específico
    if (filtros.clienteId) {
      clientesFiltrados = clientesFiltrados.filter(c => c.id === filtros.clienteId);
      parcelasFiltradas = parcelasFiltradas.filter(p => p.clienteId === filtros.clienteId);
    }

    // Filtro por período
    if (filtros.dataInicio || filtros.dataFim) {
      parcelasFiltradas = parcelasFiltradas.filter(parcela => {
        const dataReferencia = parcela.dataPagamento || parcela.dataVencimento;

        if (filtros.dataInicio && dataReferencia < filtros.dataInicio) {
          return false;
        }

        if (filtros.dataFim && dataReferencia > filtros.dataFim) {
          return false;
        }

        return true;
      });
    }

    // Filtro por status de pagamento
    if (filtros.statusPagamento && filtros.statusPagamento.length > 0) {
      parcelasFiltradas = parcelasFiltradas.filter(p =>
        filtros.statusPagamento!.includes(p.status as StatusPagamento)
      );
    }

    // Filtro por valor
    if (filtros.valorMinimo !== undefined || filtros.valorMaximo !== undefined) {
      clientesFiltrados = clientesFiltrados.filter(cliente => {
        const valor = cliente.contrato.valorTotal;

        if (filtros.valorMinimo !== undefined && valor < filtros.valorMinimo) {
          return false;
        }

        if (filtros.valorMaximo !== undefined && valor > filtros.valorMaximo) {
          return false;
        }

        return true;
      });

      // Filtrar parcelas dos clientes que passaram no filtro de valor
      const clienteIds = clientesFiltrados.map(c => c.id);
      parcelasFiltradas = parcelasFiltradas.filter(p => clienteIds.includes(p.clienteId));
    }

    return { clientes: clientesFiltrados, parcelas: parcelasFiltradas };
  }

  /**
   * Invalida cache quando dados são modificados
   */
  invalidarCacheAposMudanca(tipoMudanca: 'pagamento' | 'cliente' | 'parcela', clienteId?: string): void {
    this.cacheService.invalidateOnDataChange(tipoMudanca, clienteId);
  }

  /**
   * Pré-carrega dados comuns no cache
   */
  precarregarDadosComuns(usuarioId?: string): void {
    this.cacheService.preloadCommonData(usuarioId, () => this.obterDadosRelatorioSemCache({}, usuarioId));
  }

  /**
   * Força atualização de dados específicos
   */
  forcarAtualizacao(filtros: FiltrosRelatorio, usuarioId?: string): void {
    this.cacheService.forceRefresh(filtros, usuarioId);
  }

  /**
   * Obtém estatísticas do cache
   */
  obterEstatisticasCache(): ReturnType<RelatorioCacheService['getCacheStats']> {
    return this.cacheService.getCacheStats();
  }

  /**
   * Calcula receita mensal baseada nos pagamentos realizados
   */
  private calcularReceitaMensal(parcelas: Parcela[]): DadosMensais[] {
    const receitaPorMes = new Map<string, { valor: number, valorPrevisto: number }>();

    parcelas.forEach(parcela => {
      // Para receita realizada, usar data de pagamento
      if (parcela.status === 'pago' && parcela.dataPagamento) {
        const chave = `${parcela.dataPagamento.getFullYear()}-${parcela.dataPagamento.getMonth()}`;
        const atual = receitaPorMes.get(chave) || { valor: 0, valorPrevisto: 0 };
        atual.valor += parcela.valorPago || 0;
        receitaPorMes.set(chave, atual);
      }

      // Para receita prevista, usar data de vencimento
      const chaveVencimento = `${parcela.dataVencimento.getFullYear()}-${parcela.dataVencimento.getMonth()}`;
      const atualVencimento = receitaPorMes.get(chaveVencimento) || { valor: 0, valorPrevisto: 0 };
      atualVencimento.valorPrevisto += parcela.valorParcela;
      receitaPorMes.set(chaveVencimento, atualVencimento);
    });

    // Converter para array e ordenar
    return Array.from(receitaPorMes.entries())
      .map(([chave, dados]) => {
        const [ano, mes] = chave.split('-').map(Number);
        const nomesMeses = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        return {
          mes: nomesMeses[mes],
          ano,
          valor: dados.valor,
          valorPrevisto: dados.valorPrevisto
        };
      })
      .sort((a, b) => {
        if (a.ano !== b.ano) return a.ano - b.ano;
        const mesesOrdem = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return mesesOrdem.indexOf(a.mes) - mesesOrdem.indexOf(b.mes);
      });
  }

  /**
   * Calcula distribuição de status das parcelas
   */
  private calcularDistribuicaoStatus(parcelas: Parcela[]): DistribuicaoStatus {
    const pagos = parcelas.filter(p => p.status === 'pago').length;
    const pendentes = parcelas.filter(p => p.status === 'pendente').length;
    const atrasados = parcelas.filter(p => p.status === 'atrasado').length;

    return { pagos, pendentes, atrasados };
  }

  /**
   * Calcula evolução da taxa de inadimplência ao longo do tempo
   */
  private calcularEvolucaoInadimplencia(parcelas: Parcela[]): DadosMensais[] {
    const dadosPorMes = new Map<string, { total: number, atrasadas: number }>();

    parcelas.forEach(parcela => {
      const chave = `${parcela.dataVencimento.getFullYear()}-${parcela.dataVencimento.getMonth()}`;
      const atual = dadosPorMes.get(chave) || { total: 0, atrasadas: 0 };

      atual.total++;
      if (parcela.status === 'atrasado') {
        atual.atrasadas++;
      }

      dadosPorMes.set(chave, atual);
    });

    // Converter para array com taxa de inadimplência
    return Array.from(dadosPorMes.entries())
      .map(([chave, dados]) => {
        const [ano, mes] = chave.split('-').map(Number);
        const nomesMeses = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        const taxaInadimplencia = dados.total > 0 ? (dados.atrasadas / dados.total) * 100 : 0;

        return {
          mes: nomesMeses[mes],
          ano,
          valor: taxaInadimplencia
        };
      })
      .sort((a, b) => {
        if (a.ano !== b.ano) return a.ano - b.ano;
        const mesesOrdem = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return mesesOrdem.indexOf(a.mes) - mesesOrdem.indexOf(b.mes);
      });
  }

  /**
   * Calcula top clientes por receita total
   */
  private calcularTopClientesReceita(clientes: Cliente[]): TopCliente[] {
    const totalGeral = clientes.reduce((sum, c) => sum + c.contrato.valorTotal, 0);

    return clientes
      .map(cliente => ({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        valorTotal: cliente.contrato.valorTotal,
        percentual: totalGeral > 0 ? (cliente.contrato.valorTotal / totalGeral) * 100 : 0
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 10); // Top 10 clientes
  }

  /**
   * Calcula dados de evolução específicos para um cliente
   */
  private calcularEvolucaoCliente(cliente: Cliente, parcelas: Parcela[]): DadosEvolucaoCliente {
    const parcelasCliente = parcelas.filter(p => p.clienteId === cliente.id);

    // Histórico de pagamentos realizados
    const historicoPagamentos: PagamentoHistorico[] = [];
    let valorAcumulado = 0;

    const parcelasPagas = parcelasCliente
      .filter(p => p.status === 'pago')
      .sort((a, b) => {
        const dataA = a.dataPagamento || a.dataVencimento;
        const dataB = b.dataPagamento || b.dataVencimento;
        return dataA.getTime() - dataB.getTime();
      });

    parcelasPagas.forEach(parcela => {
      if (parcela.status === 'pago' && parcela.dataPagamento) {
        valorAcumulado += parcela.valorPago || parcela.valorParcela;

        historicoPagamentos.push({
          data: parcela.dataPagamento,
          valorPago: parcela.valorPago || parcela.valorParcela,
          valorAcumulado,
          numeroParcela: parcela.numeroParcela,
          status: parcela.diasAtraso > 0 ? 'atrasado' : 'pago',
          diasAtraso: parcela.diasAtraso > 0 ? parcela.diasAtraso : undefined
        });
      }
    });

    // Projeções futuras baseadas nas parcelas pendentes
    const projecoesFuturas: ProjecaoFutura[] = [];
    const parcelasPendentes = parcelasCliente
      .filter(p => p.status === 'pendente')
      .sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());

    let valorAcumuladoProjetado = valorAcumulado;
    parcelasPendentes.forEach(parcela => {
      valorAcumuladoProjetado += parcela.valorParcela;

      projecoesFuturas.push({
        data: parcela.dataVencimento,
        valorEsperado: parcela.valorParcela,
        valorAcumuladoProjetado,
        numeroParcela: parcela.numeroParcela
      });
    });

    // Métricas do cliente
    const parcelasPagasCliente = parcelasCliente.filter(p => p.status === 'pago');
    const totalPago = parcelasPagasCliente.reduce((sum, p) => sum + (p.valorPago || 0), 0);
    const saldoDevedor = Math.max(0, cliente.contrato.valorTotal - cliente.contrato.valorEntrada - totalPago);
    const percentualPago = cliente.contrato.valorTotal > 0
      ? ((cliente.contrato.valorEntrada + totalPago) / cliente.contrato.valorTotal) * 100
      : 0;

    // Média de atraso
    const pagamentosComAtraso = parcelasPagasCliente.filter(p => p.diasAtraso > 0);
    const mediaAtraso = pagamentosComAtraso.length > 0
      ? pagamentosComAtraso.reduce((sum, p) => sum + p.diasAtraso, 0) / pagamentosComAtraso.length
      : 0;

    // Próximo vencimento
    const proximoVencimento = parcelasPendentes.length > 0
      ? parcelasPendentes[0].dataVencimento
      : undefined;

    const metricasCliente: MetricasCliente = {
      totalContrato: cliente.contrato.valorTotal,
      totalPago: cliente.contrato.valorEntrada + totalPago,
      saldoDevedor,
      percentualPago,
      mediaAtraso,
      proximoVencimento
    };

    return {
      historicoPagamentos,
      projecoesFuturas,
      metricasCliente
    };
  }

  /**
   * Aplica mascaramento de dados sensíveis para usuários comuns
   */
  private aplicarMascaramentoDados(dados: DadosRelatorio): DadosRelatorio {
    // Para usuários comuns, não mascaramos dados pois eles só veem seus próprios dados
    // Mas podemos remover informações que não são relevantes para eles

    // Remover dados de outros clientes dos gráficos comparativos
    const dadosGraficosLimitados = {
      ...dados.dadosGraficos,
      // Manter apenas dados do próprio cliente
      topClientesReceita: dados.dadosGraficos.topClientesReceita.slice(0, 1)
    };

    // Limitar alertas apenas aos próprios
    const alertasLimitados = dados.alertas;

    return {
      ...dados,
      dadosGraficos: dadosGraficosLimitados,
      alertas: alertasLimitados
    };
  }

  /**
   * Verifica se o usuário tem permissão para ver dados de um cliente específico
   */
  private podeVerDadosCliente(clienteId: string, usuarioId?: string): boolean {
    // Se não há usuário específico (admin), pode ver todos
    if (!usuarioId) {
      return true;
    }

    // Para usuários comuns, implementar lógica de verificação
    // Por enquanto, assumimos que o email do usuário corresponde ao email do cliente
    // Em uma implementação mais robusta, seria necessário uma tabela de relacionamento
    return true; // A filtragem já foi feita anteriormente
  }

  /**
   * Aplica restrições de visualização baseadas no role do usuário
   */
  private aplicarRestricoesPorRole(dados: any[], usuarioId?: string): any[] {
    if (!usuarioId) {
      // Admin pode ver todos os dados
      return dados;
    }

    // Para usuários comuns, aplicar filtros adicionais se necessário
    return dados;
  }

  /**
   * Gera lista resumida de contratos
   */
  private gerarListaContratos(clientes: Cliente[], parcelas: Parcela[]): ContratoResumo[] {
    return clientes.map(cliente => {
      const parcelasCliente = parcelas.filter(p => p.clienteId === cliente.id);
      const parcelasPagas = parcelasCliente.filter(p => p.status === 'pago');
      const parcelasAtrasadas = parcelasCliente.filter(p => p.status === 'atrasado');
      const parcelasPendentes = parcelasCliente.filter(p => p.status === 'pendente');

      // Calcular valores
      const valorPago = parcelasPagas.reduce((sum, p) => sum + (p.valorPago || 0), 0);
      const valorParcelado = cliente.contrato.valorTotal - cliente.contrato.valorEntrada;
      const saldoDevedor = valorParcelado - valorPago;

      // Determinar status geral
      let statusGeral: ContratoResumo['statusGeral'] = 'em_dia';
      if (saldoDevedor <= 0) {
        statusGeral = 'quitado';
      } else if (parcelasAtrasadas.length > 0) {
        statusGeral = 'atrasado';
      }

      // Próximo vencimento
      const proximasParcelas = parcelasPendentes
        .filter(p => p.status === 'pendente')
        .sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());

      const proximoVencimento = proximasParcelas.length > 0 ? proximasParcelas[0].dataVencimento : undefined;

      // Dias de atraso (maior atraso entre as parcelas)
      const diasAtraso = parcelasAtrasadas.length > 0
        ? Math.max(...parcelasAtrasadas.map(p => p.diasAtraso))
        : 0;

      return {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        numeroContrato: cliente.contrato.numeroContrato,
        valorTotal: cliente.contrato.valorTotal,
        valorPago,
        saldoDevedor,
        statusGeral,
        proximoVencimento,
        diasAtraso
      };
    });
  }

  // ========== MÉTODOS DE PREVISÃO DE RECEBIMENTOS ==========

  /**
   * Obtém previsão de recebimentos para um mês específico
   */
  obterPrevisaoRecebimentosMes(mes: number, ano: number, usuarioId?: string): Observable<PrevisaoRecebimentosMes> {
    return combineLatest([
      this.clienteService.getClientes(),
      this.parcelaService.getParcelas()
    ]).pipe(
      map(([clientes, parcelas]) => {
        // Filtrar dados baseado no usuário (se não for admin)
        let clientesFiltrados = clientes;
        let parcelasFiltradas = parcelas;

        if (usuarioId) {
          // Para usuários comuns, filtrar apenas seus próprios dados
          clientesFiltrados = clientes.filter(cliente => cliente.email === usuarioId);
          const clienteIds = clientesFiltrados.map(c => c.id);
          parcelasFiltradas = parcelas.filter(parcela => clienteIds.includes(parcela.clienteId));
        }

        // Filtrar parcelas do mês específico
        const parcelasDoMes = parcelasFiltradas.filter(parcela => {
          const dataVencimento = parcela.dataVencimento;
          return dataVencimento.getMonth() === mes && dataVencimento.getFullYear() === ano;
        });

        // Converter parcelas para formato de previsão
        const parcelasPrevisao = this.converterParcelasParaPrevisao(parcelasDoMes, clientesFiltrados);

        // Calcular resumo do mês
        const resumo = this.calcularResumoPrevisaoMes(parcelasPrevisao);

        // Calcular total previsto
        const totalPrevisto = resumo.valorTotal;

        return {
          mes,
          ano,
          totalPrevisto,
          parcelas: parcelasPrevisao,
          resumo
        };
      })
    );
  }

  /**
   * Calcula total de parcelas com vencimento em um período específico
   */
  calcularTotalVencimentosPeriodo(dataInicio: Date, dataFim: Date, usuarioId?: string): Observable<number> {
    return combineLatest([
      this.clienteService.getClientes(),
      this.parcelaService.getParcelas()
    ]).pipe(
      map(([clientes, parcelas]) => {
        // Filtrar dados baseado no usuário (se não for admin)
        let parcelasFiltradas = parcelas;

        if (usuarioId) {
          // Para usuários comuns, filtrar apenas seus próprios dados
          const clientesFiltrados = clientes.filter(cliente => cliente.email === usuarioId);
          const clienteIds = clientesFiltrados.map(c => c.id);
          parcelasFiltradas = parcelas.filter(parcela => clienteIds.includes(parcela.clienteId));
        }

        // Filtrar parcelas do período
        const parcelasDoPeriodo = parcelasFiltradas.filter(parcela => {
          const dataVencimento = parcela.dataVencimento;
          return dataVencimento >= dataInicio && dataVencimento <= dataFim;
        });

        // Calcular total
        return parcelasDoPeriodo.reduce((total, parcela) => total + parcela.valorParcela, 0);
      })
    );
  }

  /**
   * Converte parcelas do sistema para formato de previsão
   */
  private converterParcelasParaPrevisao(parcelas: Parcela[], clientes: Cliente[]): ParcelaPrevisao[] {
    const clientesMap = new Map(clientes.map(c => [c.id, c]));

    return parcelas.map(parcela => {
      const cliente = clientesMap.get(parcela.clienteId);
      const hoje = new Date();

      // Calcular dias de atraso se aplicável
      let diasAtraso: number | undefined;
      if (parcela.status === 'atrasado') {
        diasAtraso = Math.ceil((hoje.getTime() - parcela.dataVencimento.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Determinar tipo da parcela
      let tipoParcela: TipoParcela = TipoParcela.NORMAL;
      // A entrada é um pagamento separado, não uma parcela
      // Apenas a última parcela pode ser marcada como FINAL
      if (cliente && parcela.numeroParcela === cliente.contrato.numeroParcelas) {
        tipoParcela = TipoParcela.FINAL;
      }
      // Verificar se é renegociada (pode ser implementado com base em algum campo específico)
      // Por enquanto, assumimos que todas são normais

      return {
        parcelaId: parcela.id,
        clienteId: parcela.clienteId,
        clienteNome: cliente?.nome || 'Cliente não encontrado',
        numeroContrato: cliente?.contrato.numeroContrato || 'N/A',
        numeroParcela: parcela.numeroParcela,
        valorParcela: parcela.valorParcela,
        dataVencimento: parcela.dataVencimento,
        status: parcela.status as StatusPagamento,
        diasAtraso,
        observacoes: parcela.observacao,
        tipoParcela
      };
    }).sort((a, b) => {
      // Ordenar por data de vencimento, depois por nome do cliente
      const dataComparacao = a.dataVencimento.getTime() - b.dataVencimento.getTime();
      if (dataComparacao !== 0) return dataComparacao;
      return a.clienteNome.localeCompare(b.clienteNome);
    });
  }

  /**
   * Calcula resumo da previsão do mês
   */
  private calcularResumoPrevisaoMes(parcelas: ParcelaPrevisao[]): ResumoPrevisaoMes {
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
   * Obtém dados de previsão para múltiplos meses (útil para gráficos)
   */
  obterPrevisaoMultiplosMeses(meses: { mes: number, ano: number }[], usuarioId?: string): Observable<PrevisaoRecebimentosMes[]> {
    const observables = meses.map(({ mes, ano }) =>
      this.obterPrevisaoRecebimentosMes(mes, ano, usuarioId)
    );

    return combineLatest(observables);
  }

  /**
   * Obtém previsão do ano completo
   */
  obterPrevisaoAnoCompleto(ano: number, usuarioId?: string): Observable<PrevisaoRecebimentosMes[]> {
    const mesesDoAno = Array.from({ length: 12 }, (_, i) => ({ mes: i, ano }));
    return this.obterPrevisaoMultiplosMeses(mesesDoAno, usuarioId);
  }
}
