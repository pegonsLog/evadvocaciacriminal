import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

/**
 * Guard para proteger a rota do relatório de consulta geral
 * Permite acesso para usuários autenticados (admin e comum)
 * mas com diferentes níveis de dados baseados na role
 */
export const relatorioGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verifica se o usuário está autenticado
    if (!authService.isAuthenticated()) {
        router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
        });
        return false;
    }

    const currentUser = authService.getCurrentUser();

    // Verifica se o usuário existe
    if (!currentUser) {
        console.warn('Usuário não encontrado no guard do relatório');
        router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
        });
        return false;
    }

    // Verifica se o usuário está ativo
    if (!currentUser.active) {
        console.warn('Tentativa de acesso com usuário inativo:', currentUser.email);
        router.navigate(['/acesso-negado']);
        return false;
    }

    // Verifica se o usuário tem uma role válida
    if (!Object.values(UserRole).includes(currentUser.role)) {
        console.warn('Usuário com role inválida tentando acessar relatório:', currentUser.role);
        router.navigate(['/acesso-negado']);
        return false;
    }

    // Permite acesso para usuários autenticados e ativos
    // A lógica de filtro de dados será implementada no componente
    return true;
};
