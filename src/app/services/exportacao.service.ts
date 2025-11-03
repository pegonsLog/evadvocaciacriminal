import { Injectable } from '@angular/core';
import { DadosRelatorio, FiltrosRelatorio, DadosGraficos } from '../models/relatorio.model';
import { ConfiguracaoExportacao } from '../components/relatorio-consulta-geral/exportacao/exportacao-relatorio.component';

@Injectable({
  providedIn: 'root'
})
export class ExportacaoService {

  /**
   * Exporta relatório em formato PDF
   * Nota: Requer instalação da biblioteca jsPDF
   * npm install jspdf html2canvas
   */
  async exportarPDF(dados: DadosRelatorio, filtros: FiltrosRelatorio, configuracao?: ConfiguracaoExportacao): Promise<void> {
    try {
      // Importação dinâmica para evitar erro se a biblioteca não estiver instalada
      const jsPDF = await import('jspdf').then(m => m.jsPDF);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Cabeçalho do relatório
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Consulta Geral', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Informações do filtro aplicado
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const infoFiltros = this.gerarTextoFiltros(filtros);
      if (infoFiltros) {
        doc.text(infoFiltros, 20, yPosition);
        yPosition += 10;
      }

      // Data de geração
      const dataGeracao = new Date().toLocaleString('pt-BR');
      doc.text(`Gerado em: ${dataGeracao}`, 20, yPosition);
      yPosition += 20;

      // Métricas principais
      if (!configuracao || configuracao.incluirMetricas) {
        yPosition = this.adicionarMetricasPDF(doc, dados, yPosition, pageWidth);
      }

      // Verificar se precisa de nova página
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Lista de contratos
      if (!configuracao || configuracao.incluirListaContratos) {
        yPosition = this.adicionarListaContratosPDF(doc, dados, yPosition, pageWidth, pageHeight);
      }

      // Alertas
      if (dados.alertas.length > 0 && (!configuracao || configuracao.incluirAlertas)) {
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 20;
        }
        this.adicionarAlertasPDF(doc, dados, yPosition, pageWidth);
      }

      // Salvar o arquivo
      const nomeArquivo = configuracao?.nomeArquivo
        ? `${configuracao.nomeArquivo}.pdf`
        : `relatorio-consulta-geral-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nomeArquivo);

    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      throw new Error('Erro ao gerar PDF. Verifique se as dependências estão instaladas.');
    }
  }

  /**
   * Exporta dados em formato Excel
   * Nota: Requer instalação da biblioteca SheetJS
   * npm install xlsx
   */
  async exportarExcel(dados: DadosRelatorio, filtros: FiltrosRelatorio, configuracao?: ConfiguracaoExportacao): Promise<void> {
    try {
      // Importação dinâmica para evitar erro se a biblioteca não estiver instalada
      const XLSX = await import('xlsx');

      // Criar workbook
      const workbook = XLSX.utils.book_new();

      // Aba 1: Métricas Gerais
      if (!configuracao || configuracao.incluirMetricas) {
        const dadosMetricas = this.prepararDadosMetricasExcel(dados);
        const wsMetricas = XLSX.utils.json_to_sheet(dadosMetricas);
        XLSX.utils.book_append_sheet(workbook, wsMetricas, 'Métricas Gerais');
      }

      // Aba 2: Lista de Contratos
      if (!configuracao || configuracao.incluirListaContratos) {
        const wsContratos = XLSX.utils.json_to_sheet(dados.listaContratos.map(contrato => ({
          'Cliente': contrato.clienteNome,
          'Número do Contrato': contrato.numeroContrato,
          'Valor Total': this.formatarMoeda(contrato.valorTotal),
          'Valor Pago': this.formatarMoeda(contrato.valorPago),
          'Saldo Devedor': this.formatarMoeda(contrato.saldoDevedor),
          'Status': this.formatarStatus(contrato.statusGeral),
          'Dias de Atraso': contrato.diasAtraso,
          'Próximo Vencimento': contrato.proximoVencimento ?
            contrato.proximoVencimento.toLocaleDateString('pt-BR') : 'N/A'
        })));
        XLSX.utils.book_append_sheet(workbook, wsContratos, 'Contratos');
      }

      // Aba 3: Receita Mensal
      if (dados.dadosGraficos.receitaMensal.length > 0 && (!configuracao || configuracao.incluirGraficos)) {
        const wsReceita = XLSX.utils.json_to_sheet(dados.dadosGraficos.receitaMensal.map(item => ({
          'Mês': item.mes,
          'Ano': item.ano,
          'Receita Realizada': this.formatarMoeda(item.valor),
          'Receita Prevista': this.formatarMoeda(item.valorPrevisto || 0)
        })));
        XLSX.utils.book_append_sheet(workbook, wsReceita, 'Receita Mensal');
      }

      // Aba 4: Alertas
      if (dados.alertas.length > 0 && (!configuracao || configuracao.incluirAlertas)) {
        const wsAlertas = XLSX.utils.json_to_sheet(dados.alertas.map(alerta => ({
          'Cliente': alerta.clienteNome,
          'Contrato': alerta.numeroContrato,
          'Tipo': this.formatarTipoAlerta(alerta.tipo),
          'Dias de Atraso': alerta.diasAtraso,
          'Valor em Atraso': this.formatarMoeda(alerta.valorEmAtraso),
          'Próximo Vencimento': alerta.proximoVencimento ?
            alerta.proximoVencimento.toLocaleDateString('pt-BR') : 'N/A'
        })));
        XLSX.utils.book_append_sheet(workbook, wsAlertas, 'Alertas');
      }

      // Aba 5: Informações do Relatório
      const infoRelatorio = [{
        'Campo': 'Data de Geração',
        'Valor': new Date().toLocaleString('pt-BR')
      }, {
        'Campo': 'Filtros Aplicados',
        'Valor': this.gerarTextoFiltros(filtros) || 'Nenhum filtro aplicado'
      }, {
        'Campo': 'Total de Contratos',
        'Valor': dados.listaContratos.length.toString()
      }, {
        'Campo': 'Total de Alertas',
        'Valor': dados.alertas.length.toString()
      }];

      const wsInfo = XLSX.utils.json_to_sheet(infoRelatorio);
      XLSX.utils.book_append_sheet(workbook, wsInfo, 'Informações');

      // Salvar o arquivo
      const nomeArquivo = configuracao?.nomeArquivo
        ? `${configuracao.nomeArquivo}.xlsx`
        : `relatorio-consulta-geral-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);

    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      throw new Error('Erro ao gerar Excel. Verifique se as dependências estão instaladas.');
    }
  }

  /**
   * Gera gráficos como imagens para exportação
   * Nota: Requer html2canvas para captura de elementos DOM
   */
  async gerarGraficosParaExportacao(dados: DadosGraficos): Promise<string[]> {
    try {
      const html2canvas = await import('html2canvas').then(m => m.default);
      const imagensBase64: string[] = [];

      // Buscar elementos de gráficos no DOM
      const elementosGraficos = document.querySelectorAll('.grafico-exportavel');

      for (let i = 0; i < elementosGraficos.length; i++) {
        const elemento = elementosGraficos[i];
        try {
          const canvas = await html2canvas(elemento as HTMLElement, {
            backgroundColor: '#ffffff',
            scale: 2, // Maior qualidade
            logging: false
          });

          const imagemBase64 = canvas.toDataURL('image/png');
          imagensBase64.push(imagemBase64);
        } catch (error) {
          console.warn('Erro ao capturar gráfico:', error);
        }
      }

      return imagensBase64;

    } catch (error) {
      console.error('Erro ao gerar gráficos:', error);
      return [];
    }
  }

  /**
   * Exporta apenas os dados de métricas em formato CSV
   */
  exportarMetricasCSV(dados: DadosRelatorio): void {
    const dadosCSV = this.prepararDadosMetricasExcel(dados);
    const csvContent = this.converterParaCSV(dadosCSV);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `metricas-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Exporta lista de contratos em formato CSV
   */
  exportarContratosCSV(dados: DadosRelatorio): void {
    const dadosCSV = dados.listaContratos.map(contrato => ({
      'Cliente': contrato.clienteNome,
      'Numero_Contrato': contrato.numeroContrato,
      'Valor_Total': contrato.valorTotal,
      'Valor_Pago': contrato.valorPago,
      'Saldo_Devedor': contrato.saldoDevedor,
      'Status': contrato.statusGeral,
      'Dias_Atraso': contrato.diasAtraso,
      'Proximo_Vencimento': contrato.proximoVencimento ?
        contrato.proximoVencimento.toLocaleDateString('pt-BR') : 'N/A'
    }));

    const csvContent = this.converterParaCSV(dadosCSV);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contratos-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Métodos auxiliares privados
   */

  private adicionarMetricasPDF(doc: any, dados: DadosRelatorio, yPosition: number, pageWidth: number): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Métricas Gerais', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const metricas = [
      `Total Recebido: ${this.formatarMoeda(dados.metricas.totalRecebido)}`,
      `Total Pendente: ${this.formatarMoeda(dados.metricas.totalPendente)}`,
      `Total Atrasado: ${this.formatarMoeda(dados.metricas.totalAtrasado)}`,
      `Taxa de Inadimplência: ${dados.metricas.taxaInadimplencia.toFixed(2)}%`,
      `Contratos Ativos: ${dados.metricas.numeroContratosAtivos}`,
      `Ticket Médio: ${this.formatarMoeda(dados.metricas.ticketMedio)}`,
      `Tempo Médio de Pagamento: ${dados.metricas.tempoMedioPagamento.toFixed(1)} dias`
    ];

    metricas.forEach(metrica => {
      doc.text(metrica, 20, yPosition);
      yPosition += 8;
    });

    return yPosition + 10;
  }

  private adicionarListaContratosPDF(doc: any, dados: DadosRelatorio, yPosition: number, pageWidth: number, pageHeight: number): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista de Contratos', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Cabeçalho da tabela
    const colunas = ['Cliente', 'Contrato', 'Valor Total', 'Valor Pago', 'Saldo', 'Status'];
    let xPosition = 20;
    const larguraColunas = [40, 25, 25, 25, 25, 20];

    doc.setFont('helvetica', 'bold');
    colunas.forEach((coluna, index) => {
      doc.text(coluna, xPosition, yPosition);
      xPosition += larguraColunas[index];
    });
    yPosition += 10;

    // Dados da tabela
    doc.setFont('helvetica', 'normal');
    dados.listaContratos.slice(0, 20).forEach(contrato => { // Limitar a 20 contratos por página
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }

      xPosition = 20;
      const valores = [
        contrato.clienteNome.substring(0, 15),
        contrato.numeroContrato,
        this.formatarMoedaSimples(contrato.valorTotal),
        this.formatarMoedaSimples(contrato.valorPago),
        this.formatarMoedaSimples(contrato.saldoDevedor),
        this.formatarStatus(contrato.statusGeral)
      ];

      valores.forEach((valor, index) => {
        doc.text(valor, xPosition, yPosition);
        xPosition += larguraColunas[index];
      });
      yPosition += 8;
    });

    return yPosition + 10;
  }

  private adicionarAlertasPDF(doc: any, dados: DadosRelatorio, yPosition: number, pageWidth: number): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Alertas de Cobrança', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    dados.alertas.slice(0, 10).forEach(alerta => { // Limitar a 10 alertas
      const textoAlerta = `${alerta.clienteNome} - ${this.formatarTipoAlerta(alerta.tipo)}`;
      doc.text(textoAlerta, 20, yPosition);
      yPosition += 8;
    });

    return yPosition;
  }

  private prepararDadosMetricasExcel(dados: DadosRelatorio): any[] {
    return [
      { 'Métrica': 'Total Recebido', 'Valor': this.formatarMoeda(dados.metricas.totalRecebido) },
      { 'Métrica': 'Total Pendente', 'Valor': this.formatarMoeda(dados.metricas.totalPendente) },
      { 'Métrica': 'Total Atrasado', 'Valor': this.formatarMoeda(dados.metricas.totalAtrasado) },
      { 'Métrica': 'Taxa de Inadimplência', 'Valor': `${dados.metricas.taxaInadimplencia.toFixed(2)}%` },
      { 'Métrica': 'Contratos Ativos', 'Valor': dados.metricas.numeroContratosAtivos.toString() },
      { 'Métrica': 'Ticket Médio', 'Valor': this.formatarMoeda(dados.metricas.ticketMedio) },
      { 'Métrica': 'Tempo Médio de Pagamento', 'Valor': `${dados.metricas.tempoMedioPagamento.toFixed(1)} dias` }
    ];
  }

  private gerarTextoFiltros(filtros: FiltrosRelatorio): string {
    const filtrosTexto: string[] = [];

    if (filtros.dataInicio) {
      filtrosTexto.push(`Data início: ${filtros.dataInicio.toLocaleDateString('pt-BR')}`);
    }

    if (filtros.dataFim) {
      filtrosTexto.push(`Data fim: ${filtros.dataFim.toLocaleDateString('pt-BR')}`);
    }

    if (filtros.statusPagamento && filtros.statusPagamento.length > 0) {
      filtrosTexto.push(`Status: ${filtros.statusPagamento.join(', ')}`);
    }

    if (filtros.valorMinimo !== undefined) {
      filtrosTexto.push(`Valor mínimo: ${this.formatarMoeda(filtros.valorMinimo)}`);
    }

    if (filtros.valorMaximo !== undefined) {
      filtrosTexto.push(`Valor máximo: ${this.formatarMoeda(filtros.valorMaximo)}`);
    }

    return filtrosTexto.join(' | ');
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  private formatarMoedaSimples(valor: number): string {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  }

  private formatarStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'em_dia': 'Em Dia',
      'atrasado': 'Atrasado',
      'quitado': 'Quitado'
    };
    return statusMap[status] || status;
  }

  private formatarTipoAlerta(tipo: string): string {
    const tipoMap: { [key: string]: string } = {
      'vencimento_proximo': 'Vencimento Próximo',
      'atraso_moderado': 'Atraso Moderado',
      'atraso_critico': 'Atraso Crítico'
    };
    return tipoMap[tipo] || tipo;
  }

  private converterParaCSV(dados: any[]): string {
    if (dados.length === 0) return '';

    const cabecalho = Object.keys(dados[0]).join(',');
    const linhas = dados.map(item =>
      Object.values(item).map(valor =>
        typeof valor === 'string' && valor.includes(',') ? `"${valor}"` : valor
      ).join(',')
    );

    return [cabecalho, ...linhas].join('\n');
  }
}
