import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { DadosRelatorio, FiltrosRelatorio } from '../../../models/relatorio.model';
import { ExportacaoService } from '../../../services/exportacao.service';

export interface ConfiguracaoExportacao {
    formato: 'pdf' | 'excel';
    incluirGraficos: boolean;
    incluirMetricas: boolean;
    incluirListaContratos: boolean;
    incluirAlertas: boolean;
    nomeArquivo: string;
}

@Component({
    selector: 'app-exportacao-relatorio',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './exportacao-relatorio.component.html',
    styleUrls: ['./exportacao-relatorio.component.scss']
})
export class ExportacaoRelatorioComponent {
    @Input() dadosRelatorio: DadosRelatorio | null = null;
    @Input() filtrosAplicados: FiltrosRelatorio = {};
    @Output() exportacaoConcluida = new EventEmitter<void>();

    private modalService = inject(NgbModal);
    private exportacaoService = inject(ExportacaoService);

    // Estado do componente
    configuracao: ConfiguracaoExportacao = {
        formato: 'pdf',
        incluirGraficos: true,
        incluirMetricas: true,
        incluirListaContratos: true,
        incluirAlertas: true,
        nomeArquivo: this.gerarNomeArquivoPadrao()
    };

    exportando = false;
    erro: string | null = null;
    modalRef: NgbModalRef | null = null;

    /**
     * Abre o modal de configuração de exportação
     */
    abrirModalExportacao(content: any): void {
        if (!this.dadosRelatorio) {
            this.erro = 'Nenhum dado disponível para exportação';
            return;
        }

        this.resetarEstado();
        this.configuracao.nomeArquivo = this.gerarNomeArquivoPadrao();
        this.modalRef = this.modalService.open(content, {
            size: 'lg',
            backdrop: 'static',
            keyboard: false
        });
    }

    /**
     * Fecha o modal de exportação
     */
    fecharModal(): void {
        if (this.modalRef) {
            this.modalRef.close();
            this.modalRef = null;
        }
        this.resetarEstado();
    }

    /**
     * Executa a exportação com as configurações selecionadas
     */
    async executarExportacao(): Promise<void> {
        if (!this.dadosRelatorio || this.exportando) {
            return;
        }

        this.exportando = true;
        this.erro = null;

        try {
            // Preparar dados filtrados baseados na configuração
            const dadosFiltrados = this.prepararDadosParaExportacao();

            if (this.configuracao.formato === 'pdf') {
                await this.exportacaoService.exportarPDF(
                    dadosFiltrados,
                    this.filtrosAplicados,
                    this.configuracao
                );
            } else {
                await this.exportacaoService.exportarExcel(
                    dadosFiltrados,
                    this.filtrosAplicados,
                    this.configuracao
                );
            }

            this.exportacaoConcluida.emit();
            this.fecharModal();
        } catch (error) {
            console.error('Erro na exportação:', error);
            this.erro = 'Erro ao gerar o arquivo. Tente novamente.';
        } finally {
            this.exportando = false;
        }
    }

    /**
     * Prepara os dados para exportação baseado na configuração
     */
    private prepararDadosParaExportacao(): DadosRelatorio {
        if (!this.dadosRelatorio) {
            throw new Error('Dados do relatório não disponíveis');
        }

        const dadosFiltrados: DadosRelatorio = {
            metricas: this.configuracao.incluirMetricas ? this.dadosRelatorio.metricas : {} as any,
            dadosGraficos: this.configuracao.incluirGraficos ? this.dadosRelatorio.dadosGraficos : {} as any,
            listaContratos: this.configuracao.incluirListaContratos ? this.dadosRelatorio.listaContratos : [],
            alertas: this.configuracao.incluirAlertas ? this.dadosRelatorio.alertas : []
        };

        return dadosFiltrados;
    }

    /**
     * Gera nome padrão para o arquivo baseado na data atual
     */
    private gerarNomeArquivoPadrao(): string {
        const agora = new Date();
        const dataFormatada = agora.toISOString().split('T')[0]; // YYYY-MM-DD
        return `relatorio-consulta-geral-${dataFormatada}`;
    }

    /**
     * Reseta o estado do componente
     */
    private resetarEstado(): void {
        this.exportando = false;
        this.erro = null;
    }

    /**
     * Atualiza o formato de exportação e ajusta configurações relacionadas
     */
    onFormatoChange(): void {
        // Ajustar configurações específicas do formato se necessário
        if (this.configuracao.formato === 'excel') {
            // Excel pode ter limitações com gráficos
            // Manter configuração atual por enquanto
        }
    }

    /**
     * Valida se a configuração atual é válida
     */
    isConfiguracaoValida(): boolean {
        return (
            this.configuracao.nomeArquivo.trim().length > 0 &&
            (this.configuracao.incluirMetricas ||
                this.configuracao.incluirGraficos ||
                this.configuracao.incluirListaContratos ||
                this.configuracao.incluirAlertas)
        );
    }

    /**
     * Retorna preview dos dados que serão exportados
     */
    getPreviewDados(): any {
        if (!this.dadosRelatorio) return null;

        const preview: any = {};

        if (this.configuracao.incluirMetricas) {
            preview.metricas = {
                totalRecebido: this.dadosRelatorio.metricas.totalRecebido,
                totalPendente: this.dadosRelatorio.metricas.totalPendente,
                numeroContratos: this.dadosRelatorio.metricas.numeroContratosAtivos
            };
        }

        if (this.configuracao.incluirListaContratos) {
            preview.contratos = {
                total: this.dadosRelatorio.listaContratos.length,
                amostra: this.dadosRelatorio.listaContratos.slice(0, 3)
            };
        }

        if (this.configuracao.incluirAlertas) {
            preview.alertas = {
                total: this.dadosRelatorio.alertas.length
            };
        }

        if (this.configuracao.incluirGraficos) {
            preview.graficos = {
                receitaMensal: this.dadosRelatorio.dadosGraficos.receitaMensal.length > 0,
                distribuicaoStatus: true,
                evolucaoInadimplencia: this.dadosRelatorio.dadosGraficos.evolucaoInadimplencia.length > 0
            };
        }

        return preview;
    }

    /**
     * Formata valor monetário para exibição
     */
    formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    /**
     * Retorna ícone baseado no formato selecionado
     */
    getIconeFormato(): string {
        return this.configuracao.formato === 'pdf' ? 'fas fa-file-pdf' : 'fas fa-file-excel';
    }

    /**
     * Retorna classe CSS baseada no formato selecionado
     */
    getClasseFormato(): string {
        return this.configuracao.formato === 'pdf' ? 'text-danger' : 'text-success';
    }
}
