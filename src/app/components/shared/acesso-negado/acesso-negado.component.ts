import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-acesso-negado',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body text-center">
              <div class="mb-4">
                <i class="fas fa-exclamation-triangle text-warning" style="font-size: 4rem;"></i>
              </div>
              <h3 class="card-title text-danger">Acesso Negado</h3>
              <p class="card-text">
                Você não tem permissão para acessar esta área do sistema.
              </p>
              <p class="text-muted">
                Se você acredita que deveria ter acesso, entre em contato com o administrador.
              </p>
              <div class="mt-4">
                <button
                  type="button"
                  class="btn btn-primary me-2"
                  (click)="voltarHome()">
                  <i class="fas fa-home me-1"></i>
                  Voltar ao Início
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  (click)="voltarAnterior()">
                  <i class="fas fa-arrow-left me-1"></i>
                  Página Anterior
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .card {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: none;
    }

    .fas {
      opacity: 0.8;
    }

    .btn {
      min-width: 140px;
    }
  `]
})
export class AcessoNegadoComponent {

    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    voltarHome(): void {
        this.router.navigate(['/home']);
    }

    voltarAnterior(): void {
        window.history.back();
    }
}
