import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { User, UserRole } from './models/user.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'EV Advocacia Criminal';
  
  authService = inject(AuthService);
  private router = inject(Router);
  
  currentUser$ = this.authService.currentUser$;
  UserRole = UserRole;

  async logout(): Promise<void> {
    if (confirm('Deseja realmente sair?')) {
      try {
        await this.authService.logout();
        this.router.navigate(['/login']);
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
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
