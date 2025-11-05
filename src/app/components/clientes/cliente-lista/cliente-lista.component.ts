import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClienteService } from '../../../services/cliente.service';
import { Cliente } from '../../../models/cliente.model';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-cliente-lista',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cliente-lista.component.html',
  styleUrl: './cliente-lista.component.scss'
})
export class ClienteListaComponent implements OnInit {
  clientes: Cliente[] = [];
  filteredClients: Cliente[] = [];
  searchTerm: string = '';
  private authService = inject(AuthService);

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    this.clienteService.getClientes().subscribe(clientes => {
      console.log('📋 [LISTA] Clientes recebidos:', clientes.length);
      this.clientes = clientes;
      this.filteredClients = clientes;

      // Aplicar filtro se houver termo de busca
      if (this.searchTerm.trim()) {
        this.filterClients();
      }
    });
  }

  filterClients(): void {
    if (!this.searchTerm.trim()) {
      this.filteredClients = this.clientes;
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredClients = this.clientes.filter(cliente =>
      cliente.nome.toLowerCase().includes(term) ||
      cliente.cpf.toLowerCase().includes(term) ||
      cliente.telefone.toLowerCase().includes(term) ||
      cliente.email.toLowerCase().includes(term)
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredClients = this.clientes;
  }

  trackByClienteId(index: number, cliente: Cliente): string {
    return cliente.id;
  }

  verDetalhes(id: string): void {
    this.router.navigate(['/clientes', id]);
  }

  editarCliente(id: string): void {
    this.router.navigate(['/clientes/editar', id]);
  }

  async excluirCliente(id: string): Promise<void> {
    console.log('Método excluirCliente chamado com ID:', id);
    console.log('Usuário é admin?', this.authService.isAdmin());

    // Apenas administradores podem deletar
    if (!this.authService.isAdmin()) {
      console.log('Usuário não é admin, mostrando aviso');
      this.modalService.showWarning('Apenas administradores podem excluir clientes.');
      return;
    }

    const cliente = this.clienteService.getClienteById(id);
    console.log('Cliente encontrado:', cliente);

    if (!cliente) {
      console.log('Cliente não encontrado');
      this.modalService.showError('Cliente não encontrado.');
      return;
    }

    console.log('Mostrando modal de confirmação');
    const confirmado = await this.modalService.showConfirm(
      `Tem certeza que deseja excluir o cliente "${cliente.nome}"?\n\nEsta ação também removerá:\n• Todas as parcelas do cliente\n• Todos os pagamentos registrados\n\nEsta ação não pode ser desfeita.`,
      'Confirmar Exclusão'
    );

    if (confirmado) {
      console.log('Usuário confirmou exclusão, iniciando processo...');
      try {
        await this.clienteService.deleteCliente(id);
        console.log('Cliente excluído com sucesso');
        this.modalService.showSuccess('Cliente e todos os dados relacionados foram excluídos com sucesso!');

        // Atualizar a lista de clientes
        this.ngOnInit();
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        this.modalService.showError('Erro ao excluir cliente. Verifique o console para mais detalhes.');
      }
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

  getDiaVencimento(cliente: Cliente): number {
    if (cliente.contrato.dataPrimeiroVencimento) {
      return this.criarDataSegura(cliente.contrato.dataPrimeiroVencimento).getDate();
    }
    return 10; // Valor padrão para compatibilidade
  }

  private criarDataSegura(data: Date | string): Date {
    if (data instanceof Date) {
      return new Date(data);
    }

    if (typeof data === 'string') {
      if (data.includes('T')) {
        return new Date(data);
      }
      return new Date(data + 'T12:00:00');
    }

    return new Date(data);
  }
}
