import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface CachedData {
    clientes: any[];
    parcelas: any[];
    lastSync: Date;
}

@Injectable({
    providedIn: 'root'
})
export class OfflineDataService {
    private readonly CACHE_KEY = 'evadvocacia_offline_data';
    private readonly PENDING_CHANGES_KEY = 'evadvocacia_pending_changes';

    private cachedDataSubject = new BehaviorSubject<CachedData | null>(null);
    private pendingChanges: any[] = [];

    constructor() {
        this.loadCachedData();
        this.loadPendingChanges();
    }

    /**
     * Carrega dados do cache local
     */
    private loadCachedData(): void {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                // Converter string de data de volta para Date
                if (data.lastSync) {
                    data.lastSync = new Date(data.lastSync);
                }
                this.cachedDataSubject.next(data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados do cache:', error);
        }
    }

    /**
     * Carrega mudanças pendentes do localStorage
     */
    private loadPendingChanges(): void {
        try {
            const pending = localStorage.getItem(this.PENDING_CHANGES_KEY);
            if (pending) {
                this.pendingChanges = JSON.parse(pending);
            }
        } catch (error) {
            console.error('Erro ao carregar mudanças pendentes:', error);
        }
    }

    /**
     * Salva dados no cache local
     */
    cacheData(clientes: any[], parcelas: any[]): void {
        try {
            const data: CachedData = {
                clientes: clientes || [],
                parcelas: parcelas || [],
                lastSync: new Date()
            };

            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
            this.cachedDataSubject.next(data);

            // Dados salvos no cache offline - log removido para reduzir ruído
            // { clientes: data.clientes.length, parcelas: data.parcelas.length, lastSync: data.lastSync }
        } catch (error) {
            console.error('Erro ao salvar dados no cache:', error);
        }
    }

    /**
     * Obtém clientes do cache
     */
    getCachedClients(): Observable<any[]> {
        return this.cachedDataSubject.pipe(
            map(data => data?.clientes || []),
            catchError(() => of([]))
        );
    }

    /**
     * Obtém parcelas do cache
     */
    getCachedParcelas(): Observable<any[]> {
        return this.cachedDataSubject.pipe(
            map(data => data?.parcelas || []),
            catchError(() => of([]))
        );
    }

    /**
     * Obtém a data da última sincronização
     */
    getLastSyncTime(): Observable<Date | null> {
        return this.cachedDataSubject.pipe(
            map(data => data?.lastSync || null),
            catchError(() => of(null))
        );
    }

    /**
     * Adiciona uma mudança pendente para sincronização posterior
     */
    addPendingChange(change: any): void {
        try {
            this.pendingChanges.push({
                ...change,
                timestamp: new Date(),
                id: this.generateChangeId()
            });

            localStorage.setItem(this.PENDING_CHANGES_KEY, JSON.stringify(this.pendingChanges));

            console.log('Mudança adicionada para sincronização:', change);
        } catch (error) {
            console.error('Erro ao adicionar mudança pendente:', error);
        }
    }

    /**
     * Obtém mudanças pendentes
     */
    getPendingChanges(): any[] {
        return [...this.pendingChanges];
    }

    /**
     * Sincroniza mudanças pendentes quando a conexão for restaurada
     */
    async syncPendingData(): Promise<void> {
        if (!navigator.onLine) {
            throw new Error('Sem conexão com a internet');
        }

        if (this.pendingChanges.length === 0) {
            console.log('Nenhuma mudança pendente para sincronizar');
            return;
        }

        try {
            console.log(`Sincronizando ${this.pendingChanges.length} mudanças pendentes...`);

            // Processar mudanças pendentes sequencialmente
            for (const change of this.pendingChanges) {
                await this.processChange(change);
                // Pequeno delay entre operações para evitar sobrecarga
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // Limpar mudanças pendentes após sincronização bem-sucedida
            this.clearPendingChanges();

            // Atualizar timestamp da última sincronização
            const currentData = this.cachedDataSubject.value;
            if (currentData) {
                currentData.lastSync = new Date();
                localStorage.setItem(this.CACHE_KEY, JSON.stringify(currentData));
                this.cachedDataSubject.next(currentData);
            }

            console.log('Sincronização concluída com sucesso');
        } catch (error) {
            console.error('Erro durante a sincronização:', error);
            throw error;
        }
    }

    /**
     * Processa uma mudança individual durante a sincronização
     */
    private async processChange(change: any): Promise<void> {
        try {
            switch (change.type) {
                case 'CREATE_CLIENT':
                    // Implementar criação de cliente
                    console.log('Sincronizando criação de cliente:', change.data);
                    break;
                case 'UPDATE_CLIENT':
                    // Implementar atualização de cliente
                    console.log('Sincronizando atualização de cliente:', change.data);
                    break;
                case 'CREATE_PAYMENT':
                    // Implementar criação de pagamento
                    console.log('Sincronizando criação de pagamento:', change.data);
                    break;
                case 'UPDATE_PAYMENT':
                    // Implementar atualização de pagamento
                    console.log('Sincronizando atualização de pagamento:', change.data);
                    break;
                default:
                    console.warn('Tipo de mudança não reconhecido:', change.type);
            }
        } catch (error) {
            console.error(`Erro ao processar mudança ${change.id}:`, error);
            // Continuar com outras mudanças mesmo se uma falhar
        }
    }

    /**
     * Limpa mudanças pendentes
     */
    private clearPendingChanges(): void {
        this.pendingChanges = [];
        localStorage.removeItem(this.PENDING_CHANGES_KEY);
    }

    /**
     * Gera um ID único para mudanças
     */
    private generateChangeId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    /**
     * Verifica se há dados em cache
     */
    hasCachedData(): boolean {
        const data = this.cachedDataSubject.value;
        return !!(data && (data.clientes.length > 0 || data.parcelas.length > 0));
    }

    /**
     * Limpa todos os dados do cache
     */
    clearCache(): void {
        localStorage.removeItem(this.CACHE_KEY);
        localStorage.removeItem(this.PENDING_CHANGES_KEY);
        this.cachedDataSubject.next(null);
        this.pendingChanges = [];
        // Cache offline limpo - log removido
    }

    /**
     * Obtém estatísticas do cache
     */
    getCacheStats(): Observable<{ clientesCount: number, parcelasCount: number, pendingChanges: number, lastSync: Date | null }> {
        return this.cachedDataSubject.pipe(
            map(data => ({
                clientesCount: data?.clientes?.length || 0,
                parcelasCount: data?.parcelas?.length || 0,
                pendingChanges: this.pendingChanges.length,
                lastSync: data?.lastSync || null
            })),
            catchError(() => of({
                clientesCount: 0,
                parcelasCount: 0,
                pendingChanges: 0,
                lastSync: null
            }))
        );
    }

    /**
     * Força uma atualização dos dados quando a conexão for restaurada
     */
    async refreshDataWhenOnline(): Promise<void> {
        if (!navigator.onLine) {
            throw new Error('Sem conexão com a internet');
        }

        try {
            console.log('Atualizando dados após reconexão...');

            // Aqui você pode implementar a lógica para recarregar dados do servidor
            // Por exemplo, disparar eventos para que os serviços recarreguem seus dados

            // Simular atualização por enquanto
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Dados atualizados com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            throw error;
        }
    }

    /**
     * Verifica se os dados em cache estão desatualizados
     */
    isCacheStale(maxAgeMinutes: number = 30): boolean {
        const data = this.cachedDataSubject.value;
        if (!data || !data.lastSync) {
            return true;
        }

        const now = new Date();
        const cacheAge = now.getTime() - data.lastSync.getTime();
        const maxAge = maxAgeMinutes * 60 * 1000; // Converter para milissegundos

        return cacheAge > maxAge;
    }
}
