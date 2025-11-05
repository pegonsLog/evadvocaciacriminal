import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, fromEvent, merge, of } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { OfflineDataService } from '../../../services/offline-data.service';

@Component({
    selector: 'app-offline-status',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './offline-status.component.html',
    styleUrls: ['./offline-status.component.scss']
})
export class OfflineStatusComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    isOnline = navigator.onLine;
    showOfflineMessage = false;

    constructor(
        private router: Router,
        public offlineDataService: OfflineDataService
    ) { }

    ngOnInit() {
        this.monitorNetworkStatus();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private monitorNetworkStatus() {
        // Monitora mudanças no status de conectividade
        merge(
            of(navigator.onLine),
            fromEvent(window, 'online').pipe(map(() => true)),
            fromEvent(window, 'offline').pipe(map(() => false))
        )
            .pipe(takeUntil(this.destroy$))
            .subscribe(isOnline => {
                const wasOffline = !this.isOnline;
                this.isOnline = isOnline;

                if (!isOnline) {
                    console.log('🔴 Aplicação está offline');
                    this.showOfflineMessage = true;

                    // Redirecionar para página offline se houver dados em cache após 3 segundos
                    if (this.offlineDataService.hasCachedData()) {
                        setTimeout(() => {
                            if (!this.isOnline) { // Verificar se ainda está offline
                                this.router.navigate(['/offline']);
                            }
                        }, 3000);
                    }
                } else {
                    console.log('🟢 Aplicação está online');

                    // Se estava offline e agora está online, mostrar mensagem de reconexão
                    if (wasOffline) {
                        this.showOfflineMessage = true;
                        // Sincronizar dados pendentes quando voltar online
                        this.syncPendingData();

                        // Esconde a mensagem após 4 segundos quando volta online
                        setTimeout(() => {
                            this.showOfflineMessage = false;
                        }, 4000);
                    }
                }
            });
    }

    private async syncPendingData() {
        try {
            // Sincronizar mudanças pendentes
            await this.offlineDataService.syncPendingData();

            // Atualizar dados se estiverem desatualizados
            if (this.offlineDataService.isCacheStale(15)) { // 15 minutos
                await this.offlineDataService.refreshDataWhenOnline();
            }
        } catch (error) {
            console.error('Erro ao sincronizar dados pendentes:', error);
        }
    }

    getConnectionStatus(): string {
        return this.isOnline ? 'online' : 'offline';
    }

    getStatusMessage(): string {
        if (this.isOnline) {
            return 'Conectado à internet';
        } else {
            const hasCachedData = this.offlineDataService.hasCachedData();
            return hasCachedData
                ? 'Sem conexão com a internet. Você pode visualizar dados salvos localmente.'
                : 'Sem conexão com a internet. Algumas funcionalidades estão limitadas.';
        }
    }

    goToOfflinePage() {
        this.router.navigate(['/offline']);
    }
}
