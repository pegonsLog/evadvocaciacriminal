import { Component, inject } from '@angular/core';
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
export class AppComponent {
  title = 'EV Advocacia Criminal';
  
  authService = inject(AuthService);
  private router = inject(Router);
  private modalService = inject(ModalService);
  
  currentUser$ = this.authService.currentUser$;
  UserRole = UserRole;

  async logout(): Promise<void> {
    this.modalService.showConfirm(
      'Deseja realmente sair?',
      async () => {
        try {
          await this.authService.logout();
          this.router.navigate(['/login']);
        } catch (error) {
          console.error('Erro ao fazer logout:', error);
          this.modalService.showError('Erro ao fazer logout.');
        }
      },
      'Confirmar Logout'
    );
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}
