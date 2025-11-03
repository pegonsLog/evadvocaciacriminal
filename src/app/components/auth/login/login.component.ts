import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';

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
  private modalService = inject(ModalService);

  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  returnUrl = '/home';
  showPassword = false;

  constructor() {
    // Se já estiver autenticado, redireciona
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }

    // Obtém URL de retorno dos query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';

    this.loginForm = this.fb.group({
      email: ['evadvocaciacriminal@gmail.com', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
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

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  async onForgotPassword(): Promise<void> {
    const email = this.loginForm.get('email')?.value;

    if (!email) {
      this.errorMessage = 'Digite seu email primeiro para recuperar a senha';
      return;
    }

    if (this.loginForm.get('email')?.invalid) {
      this.errorMessage = 'Digite um email válido para recuperar a senha';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.resetPassword(email);

      // Modal personalizado com instruções detalhadas
      this.modalService.showInfo(
        `Email de recuperação enviado para: ${email}

📧 VERIFIQUE TAMBÉM A PASTA SPAM/LIXO ELETRÔNICO

⏰ O link de recuperação expira em 1 hora
🔒 Se você não solicitou esta recuperação, ignore este email

💡 Dica: Adicione noreply@firebase.com à sua lista de contatos confiáveis para evitar que futuros emails vão para o spam.

Não recebeu o email? Aguarde alguns minutos e verifique todas as pastas.`,
        '📧 Email de Recuperação Enviado'
      );
    } catch (error: any) {
      this.errorMessage = error.message || 'Erro ao enviar email de recuperação';
      console.error('Erro no reset de senha:', error);
    } finally {
      this.loading = false;
    }
  }
}
