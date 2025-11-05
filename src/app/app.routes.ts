import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ClienteListaComponent } from './components/clientes/cliente-lista/cliente-lista.component';
import { ClienteFormComponent } from './components/clientes/cliente-form/cliente-form.component';
import { ClienteDetalhesComponent } from './components/clientes/cliente-detalhes/cliente-detalhes.component';
import { PagamentoListaComponent } from './components/pagamentos/pagamento-lista/pagamento-lista.component';
import { PagamentoFormComponent } from './components/pagamentos/pagamento-form/pagamento-form.component';
import { ParcelaListaComponent } from './components/parcelas/parcela-lista/parcela-lista.component';
import { ControlePagamentosComponent } from './components/controle-pagamentos/controle-pagamentos.component';
import { RelatorioConsultaGeralComponent } from './components/relatorio-consulta-geral/relatorio-consulta-geral.component';
import { LoginComponent } from './components/auth/login/login.component';
import { UserManagementComponent } from './components/auth/user-management/user-management.component';
import { InitialSetupComponent } from './components/auth/initial-setup/initial-setup.component';
import { AcessoNegadoComponent } from './components/shared/acesso-negado/acesso-negado.component';
import { OfflinePageComponent } from './components/shared/offline-page/offline-page.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { relatorioGuard } from './guards/relatorio.guard';

export const routes: Routes = [
  // Rotas públicas
  { path: 'login', component: LoginComponent },
  { path: 'setup', component: InitialSetupComponent },
  { path: 'acesso-negado', component: AcessoNegadoComponent },
  { path: 'offline', component: OfflinePageComponent },

  // Redireciona para home se autenticado, senão para login
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // Rotas protegidas - requerem autenticação
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard]
  },
  {
    path: 'clientes',
    component: ClienteListaComponent,
    canActivate: [authGuard]
  },
  {
    path: 'clientes/novo',
    component: ClienteFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'clientes/editar/:id',
    component: ClienteFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'clientes/:id',
    component: ClienteDetalhesComponent,
    canActivate: [authGuard]
  },
  {
    path: 'parcelas/:clienteId',
    component: ParcelaListaComponent,
    canActivate: [authGuard]
  },
  {
    path: 'pagamentos/:id',
    component: PagamentoListaComponent,
    canActivate: [authGuard]
  },
  {
    path: 'pagamentos/novo/:clienteId',
    component: PagamentoFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'pagamentos/editar/:id',
    component: PagamentoFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'controle-pagamentos',
    component: ControlePagamentosComponent,
    canActivate: [authGuard]
  },
  {
    path: 'relatorio-consulta-geral',
    component: RelatorioConsultaGeralComponent,
    canActivate: [relatorioGuard]
  },

  // Rota exclusiva para administradores
  {
    path: 'usuarios',
    component: UserManagementComponent,
    canActivate: [adminGuard]
  },

  // Rota padrão
  { path: '**', redirectTo: '/home' }
];
