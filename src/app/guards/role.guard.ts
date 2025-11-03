import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

/**
 * Guard genérico para verificar roles específicas
 * Uso: canActivate: [roleGuard], data: { roles: [UserRole.ADMIN, UserRole.COMUM] }
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  const requiredRoles = route.data['roles'] as UserRole[];
  const currentUser = authService.getCurrentUser();

  if (requiredRoles && currentUser && requiredRoles.includes(currentUser.role)) {
    return true;
  }

  // Usuário autenticado mas sem a role necessária
  router.navigate(['/acesso-negado']);
  return false;
};
