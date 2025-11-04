import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { User, UserRole } from '../models/user.model';

/**
 * Serviço para controle de acesso e permissões do sistema
 */
@Injectable({
    providedIn: 'root'
})
export class AcessoControleService {
    private authService = inject(AuthService);
    private logCache = new Map<string, number>();
    private readonly LOG_DEBOUNCE_TIME = 5000; // 5 segundos

    /**
     * Verifica se o usuário atual é administrador
     */
    isAdmin(): boolean {
        return this.authService.isAdmin();
    }

    /**
     * Verifica se o usuário atual é um usuário comum
     */
    isUsuarioComum(): boolean {
        const user = this.authService.getCurrentUser();
        return user?.role === UserRole.COMUM;
    }

    /**
     * Verifica se o usuário tem permissão para acessar dados de todos os clientes
     */
    podeAcessarTodosClientes(): boolean {
        return this.isAdmin();
    }

    /**
     * Verifica se o usuário pode ver dados financeiros consolidados
     */
    podeVerDadosFinanceirosConsolidados(): boolean {
        return this.isAdmin();
    }

    /**
     * Verifica se o usuário pode exportar relatórios
     */
    podeExportarRelatorios(): boolean {
        // Tanto admin quanto usuários comuns podem exportar seus próprios dados
        return this.authService.isAuthenticated();
    }

    /**
     * Verifica se o usuário pode ver alertas de inadimplência de outros clientes
     */
    podeVerAlertasGerais(): boolean {
        return this.isAdmin();
    }

    /**
     * Verifica se o usuário pode acessar dados de um cliente específico
     */
    podeAcessarDadosCliente(clienteEmail: string): boolean {
        const user = this.authService.getCurrentUser();

        if (!user || !user.active) {
            console.warn('Tentativa de acesso com usuário inválido ou inativo');
            return false;
        }

        // Validar formato do email
        if (!clienteEmail || !this.isValidEmail(clienteEmail)) {
            console.warn('Email de cliente inválido:', clienteEmail);
            return false;
        }

        // Admin pode acessar dados de qualquer cliente
        if (user.role === UserRole.ADMIN) {
            console.log(`Admin ${user.email} acessando dados do cliente: ${clienteEmail}`);
            return true;
        }

        // Usuário comum só pode acessar seus próprios dados
        const podeAcessar = user.email === clienteEmail;

        if (!podeAcessar) {
            console.warn(`Usuário ${user.email} tentou acessar dados de outro cliente: ${clienteEmail}`);
        }

        return podeAcessar;
    }

    /**
     * Valida formato de email
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Obtém o ID do usuário para filtros (null para admin, email para usuário comum)
     */
    getUsuarioIdParaFiltro(): string | undefined {
        const user = this.authService.getCurrentUser();

        if (!user || user.role === UserRole.ADMIN) {
            return undefined; // Admin vê todos os dados
        }

        return user.email; // Usuário comum vê apenas seus dados
    }

    /**
     * Verifica se o usuário pode ver métricas comparativas
     */
    podeVerMetricasComparativas(): boolean {
        return this.isAdmin();
    }

    /**
     * Verifica se o usuário pode ver gráficos de performance geral
     */
    podeVerGraficosPerformanceGeral(): boolean {
        return this.isAdmin();
    }

    /**
     * Aplica mascaramento de dados sensíveis baseado no role
     */
    aplicarMascaramentoPorRole<T>(dados: T, camposSensiveis: string[] = []): T {
        const user = this.authService.getCurrentUser();

        // Admin vê todos os dados sem mascaramento
        if (!user || user.role === UserRole.ADMIN) {
            return dados;
        }

        // Para usuários comuns, aplicar mascaramento se necessário
        // Por enquanto, retornamos os dados sem mascaramento pois eles só veem seus próprios dados
        return dados;
    }

    /**
     * Obtém lista de funcionalidades disponíveis para o usuário atual
     */
    getFuncionalidadesDisponiveis(): string[] {
        const user = this.authService.getCurrentUser();

        if (!user) {
            return [];
        }

        const funcionalidades = [
            'visualizar_proprios_dados',
            'exportar_proprios_dados',
            'ver_historico_pagamentos',
            'ver_projecoes_futuras'
        ];

        if (user.role === UserRole.ADMIN) {
            funcionalidades.push(
                'visualizar_todos_dados',
                'ver_metricas_consolidadas',
                'ver_alertas_gerais',
                'exportar_dados_completos',
                'ver_graficos_comparativos',
                'gerenciar_usuarios'
            );
        }

        return funcionalidades;
    }

    /**
     * Verifica se uma funcionalidade específica está disponível
     */
    temFuncionalidade(funcionalidade: string): boolean {
        return this.getFuncionalidadesDisponiveis().includes(funcionalidade);
    }

    /**
     * Obtém mensagem de restrição personalizada baseada no contexto
     */
    getMensagemRestricao(contexto: string): string {
        const user = this.authService.getCurrentUser();

        if (!user) {
            return 'Você precisa estar logado para acessar esta funcionalidade.';
        }

        switch (contexto) {
            case 'dados_outros_clientes':
                return 'Você só pode visualizar seus próprios dados. Para ver dados de outros clientes, entre em contato com o administrador.';

            case 'metricas_consolidadas':
                return 'Métricas consolidadas estão disponíveis apenas para administradores.';

            case 'alertas_gerais':
                return 'Você pode ver apenas alertas relacionados aos seus contratos.';

            case 'exportacao_completa':
                return 'Você pode exportar apenas seus próprios dados.';

            default:
                return 'Você não tem permissão para acessar esta funcionalidade.';
        }
    }

    /**
     * Observable que emite quando as permissões do usuário mudam
     */
    get permissoesChange$(): Observable<UserRole | null> {
        return this.authService.currentUser$.pipe(
            map(user => user?.role || null)
        );
    }

    /**
     * Verifica se o usuário pode acessar dados de um período específico
     */
    podeAcessarDadosPeriodo(dataInicio?: Date, dataFim?: Date): boolean {
        const user = this.authService.getCurrentUser();

        if (!user || !user.active) {
            return false;
        }

        // Admin pode acessar qualquer período
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        // Usuários comuns têm restrições de período (ex: últimos 2 anos)
        const agora = new Date();
        const limiteMinimoData = new Date();
        limiteMinimoData.setFullYear(agora.getFullYear() - 2);

        if (dataInicio && dataInicio < limiteMinimoData) {
            console.warn(`Usuário ${user.email} tentou acessar dados muito antigos: ${dataInicio}`);
            return false;
        }

        return true;
    }

    /**
     * Aplica filtros de segurança baseados no role do usuário
     */
    aplicarFiltrosSeguranca(filtros: any): any {
        const user = this.authService.getCurrentUser();

        if (!user || !user.active) {
            return null;
        }

        const filtrosSeguro = { ...filtros };

        // Para usuários comuns, sempre filtrar por seu email
        if (user.role === UserRole.COMUM) {
            filtrosSeguro.clienteEmail = user.email;

            // Limitar período de consulta
            if (!filtrosSeguro.dataInicio) {
                const dataLimite = new Date();
                dataLimite.setFullYear(dataLimite.getFullYear() - 2);
                filtrosSeguro.dataInicio = dataLimite;
            }
        }

        return filtrosSeguro;
    }

    /**
     * Registra tentativa de acesso para auditoria com debounce para evitar spam
     */
    registrarTentativaAcesso(recurso: string, sucesso: boolean, detalhes?: string): void {
        // Temporariamente desabilitado para evitar loops infinitos
        // TODO: Implementar sistema de auditoria mais eficiente
        return;
    }

    /**
     * Verifica se o usuário pode realizar uma ação específica
     */
    podeRealizarAcao(acao: string, contexto?: any): boolean {
        const user = this.authService.getCurrentUser();

        if (!user || !user.active) {
            this.registrarTentativaAcesso(acao, false, 'Usuário não autenticado ou inativo');
            return false;
        }

        let podeRealizar = false;

        switch (acao) {
            case 'visualizar_relatorio':
                podeRealizar = true; // Todos os usuários autenticados podem ver relatórios
                break;

            case 'exportar_relatorio':
                podeRealizar = true; // Todos podem exportar seus próprios dados
                break;

            case 'ver_dados_todos_clientes':
                podeRealizar = user.role === UserRole.ADMIN;
                break;

            case 'ver_metricas_consolidadas':
                podeRealizar = user.role === UserRole.ADMIN;
                break;

            case 'gerenciar_usuarios':
                podeRealizar = user.role === UserRole.ADMIN;
                break;

            default:
                console.warn(`Ação não reconhecida: ${acao}`);
                podeRealizar = false;
        }

        this.registrarTentativaAcesso(acao, podeRealizar, contexto ? JSON.stringify(contexto) : undefined);
        return podeRealizar;
    }
}
