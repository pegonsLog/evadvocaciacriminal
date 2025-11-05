import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserRole, UserRegistration } from '../../../models/user.model';

@Component({
  selector: 'app-initial-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
      <div class="card shadow-lg" style="max-width: 500px; width: 100%;">
        <div class="card-header bg-primary text-white text-center">
          <h4 class="mb-0">
            <i class="bi bi-person-plus-fill me-2"></i>
            Configuração Inicial
          </h4>
          <small>Criar primeiro usuário administrador</small>
        </div>

        <div class="card-body p-4">
          <div class="alert alert-info" role="alert">
            <i class="bi bi-info-circle me-2"></i>
            <strong>Bem-vindo!</strong> Configure o primeiro usuário administrador do sistema.
          </div>

          <form [formGroup]="setupForm" (ngSubmit)="onSubmit()">
            <div class="mb-3">
              <label for="displayName" class="form-label">Nome Completo</label>
              <input
                type="text"
                class="form-control"
                id="displayName"
                formControlName="displayName"
                [class.is-invalid]="displayName?.invalid && displayName?.touched"
                placeholder="Digite seu nome completo"
              >
              <div class="invalid-feedback" *ngIf="displayName?.invalid && displayName?.touched">
                Nome é obrigatório
              </div>
            </div>

            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input
                type="email"
                class="form-control"
                id="email"
                formControlName="email"
                [class.is-invalid]="email?.invalid && email?.touched"
                placeholder="Digite seu email"
              >
              <div class="invalid-feedback" *ngIf="email?.invalid && email?.touched">
                <span *ngIf="email?.errors?.['required']">Email é obrigatório</span>
                <span *ngIf="email?.errors?.['email']">Email deve ter um formato válido</span>
              </div>
            </div>

            <div class="mb-3">
              <label for="password" class="form-label">Senha</label>
              <input
                type="password"
                class="form-control"
                id="password"
                formControlName="password"
                [class.is-invalid]="password?.invalid && password?.touched"
                placeholder="Digite uma senha segura"
              >
              <div class="invalid-feedback" *ngIf="password?.invalid && password?.touched">
                <span *ngIf="password?.errors?.['required']">Senha é obrigatória</span>
                <span *ngIf="password?.errors?.['minlength']">Senha deve ter no mínimo 6 caracteres</span>
              </div>
            </div>

            <div class="alert alert-warning" role="alert" *ngIf="errorMessage">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ errorMessage }}
            </div>

            <div class="alert alert-success" role="alert" *ngIf="successMessage">
              <i class="bi bi-check-circle me-2"></i>
              {{ successMessage }}
            </div>

            <div class="d-grid">
              <button
                type="submit"
                class="btn btn-primary btn-lg"
                [disabled]="loading || setupForm.invalid"
              >
                <span *ngIf="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                <i class="bi bi-person-plus me-2" *ngIf="!loading"></i>
                {{ loading ? 'Criando...' : 'Criar Administrador' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border: none;
      border-radius: 15px;
    }

    .card-header {
      border-radius: 15px 15px 0 0 !important;
    }

    .form-control {
      border-radius: 8px;
      padding: 12px;
    }

    .btn {
      border-radius: 8px;
      padding: 12px;
    }
  `]
})
export class InitialSetupComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  setupForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.setupForm = this.fb.group({
      email: ['evac.contratos@gmail.com', [Validators.required, Validators.email]],
      password: ['Criminal13@', [Validators.required, Validators.minLength(6)]],
      displayName: ['Administrador', [Validators.required]]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.setupForm.invalid) {
      this.markFormGroupTouched(this.setupForm);
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const registration: UserRegistration = {
        ...this.setupForm.value,
        role: UserRole.ADMIN
      };

      await this.authService.register(registration);

      this.successMessage = 'Administrador criado com sucesso! Redirecionando...';

      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 2000);

    } catch (error: any) {
      this.errorMessage = error.message || 'Erro ao criar administrador';
      console.error('Erro ao criar administrador:', error);
    } finally {
      this.loading = false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get email() {
    return this.setupForm.get('email');
  }

  get password() {
    return this.setupForm.get('password');
  }

  get displayName() {
    return this.setupForm.get('displayName');
  }
}
