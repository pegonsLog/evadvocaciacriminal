import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { User, UserRole } from './models/user.model';
import { ModalComponent } from './components/shared/modal/modal.component';
import { ModalService } from './services/modal.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, ModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'EV Advocacia Criminal';
  isMobileMenuOpen = false;

  authService = inject(AuthService);
  private router = inject(Router);
  private modalService = inject(ModalService);

  currentUser$ = this.authService.currentUser$;
  UserRole = UserRole;

  ngOnInit(): void {
    // Cleanup on component init
    this.updateBodyClass();
  }

  ngOnDestroy(): void {
    // Cleanup on component destroy
    if (typeof document !== 'undefined') {
      document.body.classList.remove('mobile-menu-open');
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
}
