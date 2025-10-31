import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';
import { Cliente } from '../../../models/cliente.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-cliente-lista',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cliente-lista.component.html',
  styleUrl: './cliente-lista.component.scss'
})
export class ClienteListaComponent implements OnInit {
  clientes: Cliente[] = [];
  private authService = inject(AuthService);

  constructor(
    private clienteService: ClienteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.clienteService.getClientes().subscribe(clientes => {
      this.clientes = clientes;
    });
  }

  verDetalhes(id: string): void {
    this.router.navigate(['/clientes', id]);
  }

  editarCliente(id: string): void {
    this.router.navigate(['/clientes/editar', id]);
  }

  excluirCliente(id: string): void {
    // Apenas administradores podem deletar
    if (!this.authService.isAdmin()) {
      alert('Apenas administradores podem excluir clientes.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      this.clienteService.deleteCliente(id);
    }
  }

  novoCliente(): void {
    this.router.navigate(['/clientes/novo']);
  }

  verParcelas(id: string): void {
    this.router.navigate(['/parcelas', id]);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
