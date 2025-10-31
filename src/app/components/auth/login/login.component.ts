import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  returnUrl = '/home';

  constructor() {
    // Se já estiver autenticado, redireciona
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }

    // Obtém URL de retorno dos query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';

    this.loginForm = this.fb.group({
      email: ['evadvocaciacriminal@gmail.com', [Validators.required, Validators.email]],
      password: ['Criminal13@', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.login(this.loginForm.value);
      this.router.navigate([this.returnUrl]);
    } catch (error: any) {
      this.errorMessage = error.message || 'Erro ao fazer login';
      console.error('Erro no login:', error);
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
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
