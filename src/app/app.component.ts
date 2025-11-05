import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { PWAUpdateService } from './services/pwa-update.service';
import { UserRole } from './models/user.model';
import { ModalComponent } from './components/shared/modal/modal.component';
import { OfflineStatusComponent } from './components/shared/offline-status/offline-status.component';
import { ModalService } from './services/modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, ModalComponent, OfflineStatusComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'EV Advocacia Criminal';
  isMobileMenuOpen = false;
  showUpdateNotification = false;

  authService = inject(AuthService);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private pwaUpdateService = inject(PWAUpdateService);

  currentUser$ = this.authService.currentUser$;
  UserRole = UserRole;

  private updateSubscription?: Subscription;

  ngOnInit(): void {
    // Cleanup on component init
    this.updateBodyClass();

    // Inicializar verificação de atualizações PWA
    this.initializePWAUpdates();
  }

  ngOnDestroy(): void {
    // Cleanup on component destroy
    if (typeof document !== 'undefined') {
      document.body.classList.remove('mobile-menu-open');
    }

    // Cleanup subscription
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    // Close mobile menu when screen size changes to desktop
    if (event.target.innerWidth > 768 && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.updateBodyClass();
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.updateBodyClass();
  }

  private updateBodyClass(): void {
    if (typeof document !== 'undefined') {
      if (this.isMobileMenuOpen) {
        document.body.classList.add('mobile-menu-open');
      } else {
        document.body.classList.remove('mobile-menu-open');
      }
    }
  }

  getUserRoleText(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrador';
      case UserRole.COMUM:
        return 'Usuário';
      default:
        return 'Usuário';
    }
  }

  async logout(): Promise<void> {
    const confirmar = await this.modalService.showConfirm(
      'Deseja realmente sair?',
      'Confirmar Logout'
    );

    if (confirmar) {
      try {
        await this.authService.logout();
        this.router.navigate(['/login']);
        this.closeMobileMenu();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        this.modalService.showError('Erro ao fazer logout.');
      }
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Inicializa o sistema de atualizações PWA
   */
  private initializePWAUpdates(): void {
    if (!this.pwaUpdateService.isServiceWorkerEnabled()) {
      console.log('🔧 [APP] Service Worker não está habilitado');
      return;
    }

    // Subscrever para atualizações disponíveis
    this.updateSubscription = this.pwaUpdateService.isUpdateAvailable$.subscribe(
      isAvailable => {
        if (isAvailable && this.pwaUpdateService.shouldNotifyUser()) {
          this.showUpdateNotification = true;
        }
      }
    );

    // Verificar por atualizações após 30 segundos
    setTimeout(() => {
      this.pwaUpdateService.checkForUpdate();
    }, 30000);

    // Verificar por atualizações a cada 6 horas
    setInterval(() => {
      this.pwaUpdateService.checkForUpdate();
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Aplica a atualização PWA disponível
   */
  async applyPWAUpdate(): Promise<void> {
    try {
      const updated = await this.pwaUpdateService.activateUpdate();

      if (updated) {
        // Mostrar modal de confirmação para recarregar
        const shouldReload = await this.modalService.showConfirm(
          'A aplicação foi atualizada com sucesso! Deseja recarregar a página para aplicar as mudanças?',
          'Atualização Aplicada',
          'Recarregar',
          'Mais tarde'
        );

        if (shouldReload) {
          this.pwaUpdateService.reloadApplication();
        } else {
          this.showUpdateNotification = false;
        }
      } else {
        this.modalService.showError('Não foi possível aplicar a atualização. Tente novamente mais tarde.');
      }
    } catch (error) {
      console.error('❌ [APP] Erro ao aplicar atualização PWA:', error);
      this.modalService.showError('Erro ao aplicar atualização. Tente novamente mais tarde.');
    }
  }

  /**
   * Dispensa a notificação de atualização
   */
  dismissUpdateNotification(): void {
    this.showUpdateNotification = false;
  }

  /**
   * Força uma verificação manual de atualizações
   */
  async checkForUpdates(): Promise<void> {
    try {
      const updateFound = await this.pwaUpdateService.checkForUpdate();

      if (!updateFound) {
        this.modalService.showSuccess('Você já está usando a versão mais recente da aplicação.');
      }
      // Se uma atualização for encontrada, a notificação será exibida automaticamente
    } catch (error) {
      console.error('❌ [APP] Erro ao verificar atualizações:', error);
      this.modalService.showError('Erro ao verificar atualizações. Tente novamente mais tarde.');
    }
  }
}
