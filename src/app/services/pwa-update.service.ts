import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, filter, map } from 'rxjs';

export interface UpdateStatus {
    isAvailable: boolean;
    isDownloading: boolean;
    isInstalling: boolean;
    currentVersion: string;
    availableVersion: string;
}

@Injectable({
    providedIn: 'root'
})
export class PWAUpdateService {
    private swUpdate = inject(SwUpdate);

    private updateStatusSubject = new BehaviorSubject<UpdateStatus>({
        isAvailable: false,
        isDownloading: false,
        isInstalling: false,
        currentVersion: '',
        availableVersion: ''
    });

    public updateStatus$ = this.updateStatusSubject.asObservable();
    public isUpdateAvailable$ = this.updateStatus$.pipe(
        map(status => status.isAvailable)
    );

    constructor() {
        this.initializeUpdateDetection();
    }

    /**
     * Inicializa a detecção de atualizações
     */
    private initializeUpdateDetection(): void {
        if (!this.swUpdate.isEnabled) {
            console.log('🔧 [PWA-UPDATE] Service Worker não está habilitado');
            return;
        }

        // Detecta quando uma nova versão está disponível
        this.swUpdate.versionUpdates.pipe(
            filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
        ).subscribe(event => {
            console.log('🆕 [PWA-UPDATE] Nova versão disponível:', event.latestVersion.hash);

            this.updateStatusSubject.next({
                ...this.updateStatusSubject.value,
                isAvailable: true,
                currentVersion: event.currentVersion.hash,
                availableVersion: event.latestVersion.hash
            });
        });

        // Detecta quando uma atualização foi instalada e está pronta para ativação
        this.swUpdate.versionUpdates.pipe(
            filter(evt => evt.type === 'VERSION_INSTALLATION_FAILED')
        ).subscribe(event => {
            console.error('❌ [PWA-UPDATE] Falha na instalação da atualização:', event);

            this.updateStatusSubject.next({
                ...this.updateStatusSubject.value,
                isDownloading: false,
                isInstalling: false
            });
        });
    }

    /**
     * Verifica manualmente por atualizações disponíveis
     */
    async checkForUpdate(): Promise<boolean> {
        if (!this.swUpdate.isEnabled) {
            console.log('🔧 [PWA-UPDATE] Service Worker não está habilitado');
            return false;
        }

        try {
            console.log('🔍 [PWA-UPDATE] Verificando por atualizações...');
            const updateFound = await this.swUpdate.checkForUpdate();

            if (updateFound) {
                console.log('✅ [PWA-UPDATE] Atualização encontrada');
            } else {
                console.log('ℹ️ [PWA-UPDATE] Nenhuma atualização disponível');
            }

            return updateFound;
        } catch (error) {
            console.error('❌ [PWA-UPDATE] Erro ao verificar atualizações:', error);
            return false;
        }
    }

    /**
     * Notifica o usuário sobre atualizações disponíveis
     * Retorna true se deve mostrar notificação, false caso contrário
     */
    shouldNotifyUser(): boolean {
        const status = this.updateStatusSubject.value;
        return status.isAvailable && !status.isDownloading && !status.isInstalling;
    }

    /**
     * Aplica a atualização disponível
     */
    async activateUpdate(): Promise<boolean> {
        if (!this.swUpdate.isEnabled) {
            console.log('🔧 [PWA-UPDATE] Service Worker não está habilitado');
            return false;
        }

        const status = this.updateStatusSubject.value;
        if (!status.isAvailable) {
            console.log('ℹ️ [PWA-UPDATE] Nenhuma atualização disponível para ativar');
            return false;
        }

        try {
            console.log('🔄 [PWA-UPDATE] Ativando atualização...');

            // Marca como instalando
            this.updateStatusSubject.next({
                ...status,
                isInstalling: true
            });

            // Ativa a atualização
            const activated = await this.swUpdate.activateUpdate();

            if (activated) {
                console.log('✅ [PWA-UPDATE] Atualização ativada com sucesso');

                // Reset do status após ativação
                this.updateStatusSubject.next({
                    isAvailable: false,
                    isDownloading: false,
                    isInstalling: false,
                    currentVersion: status.availableVersion,
                    availableVersion: ''
                });

                return true;
            } else {
                console.log('ℹ️ [PWA-UPDATE] Nenhuma atualização foi ativada');

                // Reset do status de instalação
                this.updateStatusSubject.next({
                    ...status,
                    isInstalling: false
                });

                return false;
            }
        } catch (error) {
            console.error('❌ [PWA-UPDATE] Erro ao ativar atualização:', error);

            // Reset do status em caso de erro
            this.updateStatusSubject.next({
                ...status,
                isInstalling: false
            });

            return false;
        }
    }

    /**
     * Recarrega a aplicação após atualização
     */
    reloadApplication(): void {
        console.log('🔄 [PWA-UPDATE] Recarregando aplicação...');
        window.location.reload();
    }

    /**
     * Obtém o status atual da atualização
     */
    getCurrentStatus(): UpdateStatus {
        return this.updateStatusSubject.value;
    }

    /**
     * Verifica se o service worker está habilitado
     */
    isServiceWorkerEnabled(): boolean {
        return this.swUpdate.isEnabled;
    }

    /**
     * Força uma verificação de atualização e notifica o usuário se necessário
     */
    async promptUserToUpdate(): Promise<void> {
        const updateAvailable = await this.checkForUpdate();

        if (updateAvailable && this.shouldNotifyUser()) {
            console.log('🔔 [PWA-UPDATE] Usuário deve ser notificado sobre atualização');
            // A notificação visual será implementada no componente que usar este serviço
        }
    }
}
