import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ClienteListaComponent } from './components/clientes/cliente-lista/cliente-lista.component';
import { ClienteFormComponent } from './components/clientes/cliente-form/cliente-form.component';
import { ClienteDetalhesComponent } from './components/clientes/cliente-detalhes/cliente-detalhes.component';
import { PagamentoListaComponent } from './components/pagamentos/pagamento-lista/pagamento-lista.component';
import { PagamentoFormComponent } from './components/pagamentos/pagamento-form/pagamento-form.component';
import { ParcelaListaComponent } from './components/parcelas/parcela-lista/parcela-lista.component';
import { ControlePagamentosComponent } from './components/controle-pagamentos/controle-pagamentos.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'clientes', component: ClienteListaComponent },
  { path: 'clientes/novo', component: ClienteFormComponent },
  { path: 'clientes/editar/:id', component: ClienteFormComponent },
  { path: 'clientes/:id', component: ClienteDetalhesComponent },
  { path: 'parcelas/:clienteId', component: ParcelaListaComponent },
  { path: 'pagamentos/:id', component: PagamentoListaComponent },
  { path: 'pagamentos/novo/:clienteId', component: PagamentoFormComponent },
  { path: 'pagamentos/editar/:id', component: PagamentoFormComponent },
  { path: 'controle-pagamentos', component: ControlePagamentosComponent },
  { path: '**', redirectTo: '/home' }
];
