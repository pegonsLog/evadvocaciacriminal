import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OfflineDataService } from '../../../services/offline-data.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-offline-page',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './offline-page.component.html',
    styleUrls: ['./offline-page.component.scss']
})
export class OfflinePageComponent implements OnInit {
    cachedClients$: Observable<any[]>;
    cachedParcelas$: Observable<any[]>;
    lastSyncTime$: Observable<Date | null>;
    cacheStats$: Observable<any>;
    isSyncing = false;

    constructor(public offlineDataService: OfflineDataService) {
        this.cachedClients$ = this.offlineDataService.getCachedClients();
        this.cachedParcelas$ = this.offlineDataService.getCachedParcelas();
        this.lastSyncTime$ = this.offlineDataService.getLastSyncTime();
        this.cacheStats$ = this.offlineDataService.getCacheStats();
    }

    ngOnInit() {
        // Verificar periodicamente o status de conexão
        setInterval(() => {
            // Força a detecção de mudanças no template
        }, 5000);
    }

    async syncWhenOnline(): Promise<void> {
        if (navigator.onLine) {
            this.isSyncing = true;
            try {
                // Sincronizar mudanças pendentes
                await this.offlineDataService.syncPendingData();

                // Atualizar dados se necessário
                if (this.offlineDataService.isCacheStale(15)) {
                    await this.offlineDataService.refreshDataWhenOnline();
                }

                // Recarregar a página para mostrar dados atualizados
                window.location.reload();
            } catch (error) {
                console.error('Erro ao sincronizar dados:', error);
                alert('Erro ao sincronizar dados. Tente novamente.');
            } finally {
                this.isSyncing = false;
            }
        }
    }

    formatDate(date: Date): string {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    getClientesCount(clientes: any[]): number {
        return clientes ? clientes.length : 0;
    }

    getParcelasCount(parcelas: any[]): number {
        return parcelas ? parcelas.length : 0;
    }

    isOnline(): boolean {
        return navigator.onLine;
    }
}
