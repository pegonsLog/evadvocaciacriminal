import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { User, UserRole, UserRegistration } from '../../../models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  users: User[] = [];
  loading = false;
  showAddForm = false;
  errorMessage = '';
  successMessage = '';

  userForm: FormGroup;
  UserRole = UserRole;

  constructor() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      displayName: ['', [Validators.required]],
      role: [UserRole.COMUM, [Validators.required]]
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    
    try {
      this.users = await this.authService.getAllUsers();
      this.users.sort((a, b) => a.displayName?.localeCompare(b.displayName || '') || 0);
    } catch (error: any) {
      this.errorMessage = 'Erro ao carregar usuários: ' + error.message;
      console.error('Erro ao carregar usuários:', error);
    } finally {
      this.loading = false;
    }
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.userForm.reset({ role: UserRole.COMUM });
      this.errorMessage = '';
    }
  }

  async onSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const registration: UserRegistration = this.userForm.value;
      await this.authService.register(registration);
      
      this.successMessage = 'Usuário criado com sucesso!';
      this.userForm.reset({ role: UserRole.COMUM });
      this.showAddForm = false;
      
      await this.loadUsers();
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Erro ao criar usuário';
      console.error('Erro ao criar usuário:', error);
    } finally {
      this.loading = false;
    }
  }

  async toggleUserStatus(user: User): Promise<void> {
    if (!user.uid) {
      this.errorMessage = 'Erro: ID do usuário não encontrado.';
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser?.uid === user.uid) {
      alert('Você não pode desativar sua própria conta!');
      return;
    }

    if (confirm(`Deseja ${user.active ? 'desativar' : 'ativar'} o usuário ${user.displayName}?`)) {
      try {
        await this.authService.toggleUserStatus(user.uid, !user.active);
        this.successMessage = `Usuário ${user.active ? 'desativado' : 'ativado'} com sucesso!`;
        await this.loadUsers();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      } catch (error: any) {
        this.errorMessage = 'Erro ao alterar status: ' + error.message;
        console.error('Erro ao alterar status:', error);
      }
    }
  }

  async deleteUser(user: User): Promise<void> {
    if (!user.uid) {
      this.errorMessage = 'Erro: ID do usuário não encontrado.';
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser?.uid === user.uid) {
      alert('Você não pode deletar sua própria conta!');
      return;
    }

    if (confirm(`Tem certeza que deseja deletar o usuário ${user.displayName}? Esta ação não pode ser desfeita.`)) {
      try {
        await this.authService.deleteUser(user.uid);
        this.successMessage = 'Usuário deletado com sucesso!';
        await this.loadUsers();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      } catch (error: any) {
        this.errorMessage = 'Erro ao deletar usuário: ' + error.message;
        console.error('Erro ao deletar usuário:', error);
      }
    }
  }

  getRoleBadgeClass(role: UserRole): string {
    return role === UserRole.ADMIN ? 'badge-admin' : 'badge-comum';
  }

  getRoleLabel(role: UserRole): string {
    return role === UserRole.ADMIN ? 'Administrador' : 'Comum';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get email() {
    return this.userForm.get('email');
  }

  get password() {
    return this.userForm.get('password');
  }

  get displayName() {
    return this.userForm.get('displayName');
  }
}
