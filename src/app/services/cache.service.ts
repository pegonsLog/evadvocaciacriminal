import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live em milissegundos
}

export interface CacheConfig {
    ttl: number; // TTL padrão em milissegundos
    maxSize: number; // Tamanho máximo do cache
    enableOfflineMode: boolean; // Habilitar modo offline
}

@Injectable({
    providedIn: 'root'
})
export class CacheService {
    private cache = new Map<string, CacheEntry<any>>();
    private cacheSubjects = new Map<string, BehaviorSubject<any>>();

    private readonly defaultConfig: CacheConfig = {
        ttl: 5 * 60 * 1000, // 5 minutos
        maxSize: 100,
        enableOfflineMode: true
    };

    private config: CacheConfig = { ...this.defaultConfig };

    /**
     * Configura as opções do cache
     */
    configure(config: Partial<CacheConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Obtém dados do cache ou executa a função de busca se não existir/expirado
     */
    get<T>(
        key: string,
        fetchFn: () => Observable<T>,
        ttl?: number
    ): Observable<T> {
        const cacheKey = this.generateCacheKey(key);
        const entry = this.cache.get(cacheKey);
        const currentTime = Date.now();
        const effectiveTtl = ttl || this.config.ttl;

        // Verificar se existe no cache e não expirou
        if (entry && (currentTime - entry.timestamp) < entry.ttl) {

            return of(entry.data);
        }

        // Verificar se já existe uma requisição em andamento
        const existingSubject = this.cacheSubjects.get(cacheKey);
        if (existingSubject) {

            return existingSubject.asObservable();
        }

        // Criar nova requisição

        const subject = new BehaviorSubject<T | null>(null);
        this.cacheSubjects.set(cacheKey, subject);

        return fetchFn().pipe(
            tap(data => {
                // Armazenar no cache
                this.set(key, data, effectiveTtl);

                // Emitir dados para subscribers
                subject.next(data);
                subject.complete();

                // Remover subject da lista de requisições ativas
                this.cacheSubjects.delete(cacheKey);
            }),
            catchError(error => {
                // Em caso de erro, tentar usar dados do cache mesmo se expirados (fallback offline)
                if (entry && this.config.enableOfflineMode) {

                    subject.next(entry.data);
                    subject.complete();
                    this.cacheSubjects.delete(cacheKey);
                    return of(entry.data);
                }

                // Se não há fallback, propagar o erro
                subject.error(error);
                this.cacheSubjects.delete(cacheKey);
                throw error;
            })
        );
    }

    /**
     * Armazena dados no cache
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const cacheKey = this.generateCacheKey(key);
        const effectiveTtl = ttl || this.config.ttl;

        // Verificar limite de tamanho do cache
        if (this.cache.size >= this.config.maxSize) {
            this.evictOldestEntries();
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: effectiveTtl
        };

        this.cache.set(cacheKey, entry);

    }

    /**
     * Remove uma entrada específica do cache
     */
    delete(key: string): boolean {
        const cacheKey = this.generateCacheKey(key);
        const deleted = this.cache.delete(cacheKey);

        if (deleted) {

        }

        return deleted;
    }

    /**
     * Invalida cache baseado em padrão de chave
     */
    invalidatePattern(pattern: string): number {
        let invalidatedCount = 0;
        const regex = new RegExp(pattern);

        for (const [key] of this.cache) {
            if (regex.test(key)) {
                this.cache.delete(key);
                invalidatedCount++;
            }
        }


        return invalidatedCount;
    }

    /**
     * Limpa todo o cache
     */
    clear(): void {
        this.cache.clear();
        this.cacheSubjects.clear();

    }

    /**
     * Obtém informações sobre o estado do cache
     */
    getCacheInfo(): {
        size: number;
        maxSize: number;
        entries: Array<{ key: string; timestamp: number; ttl: number; expired: boolean }>;
    } {
        const currentTime = Date.now();
        const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            timestamp: entry.timestamp,
            ttl: entry.ttl,
            expired: (currentTime - entry.timestamp) >= entry.ttl
        }));

        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            entries
        };
    }

    /**
     * Remove entradas expiradas do cache
     */
    cleanExpiredEntries(): number {
        const currentTime = Date.now();
        let cleanedCount = 0;

        for (const [key, entry] of this.cache) {
            if ((currentTime - entry.timestamp) >= entry.ttl) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {

        }

        return cleanedCount;
    }

    /**
     * Verifica se uma chave existe no cache e não expirou
     */
    has(key: string): boolean {
        const cacheKey = this.generateCacheKey(key);
        const entry = this.cache.get(cacheKey);

        if (!entry) return false;

        const currentTime = Date.now();
        const isExpired = (currentTime - entry.timestamp) >= entry.ttl;

        if (isExpired) {
            this.cache.delete(cacheKey);
            return false;
        }

        return true;
    }

    /**
     * Obtém dados do cache sem buscar se não existir
     */
    getFromCache<T>(key: string): T | null {
        const cacheKey = this.generateCacheKey(key);
        const entry = this.cache.get(cacheKey);

        if (!entry) return null;

        const currentTime = Date.now();
        const isExpired = (currentTime - entry.timestamp) >= entry.ttl;

        if (isExpired) {
            this.cache.delete(cacheKey);
            return null;
        }

        return entry.data;
    }

    /**
     * Métodos privados
     */

    private generateCacheKey(key: string): string {
        // Normalizar a chave para evitar problemas com caracteres especiais
        return key.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    private evictOldestEntries(): void {
        // Remove as 10% das entradas mais antigas quando o cache está cheio
        const entriesToRemove = Math.ceil(this.config.maxSize * 0.1);
        const sortedEntries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp);

        for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
            const [key] = sortedEntries[i];
            this.cache.delete(key);
        }


    }
}
