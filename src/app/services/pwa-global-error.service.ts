import { Injectable, inject, ErrorHandler } from '@angular/core';
import { PWAErrorHandlerService } from './pwa-error-handler.service';

@Injectable({
    providedIn: 'root'
})
export class PWAGlobalErrorService implements ErrorHandler {
    private pwaErrorHandler = inject(PWAErrorHandlerService);

    handleError(error: any): void {
        // Verifica se é um erro relacionado ao PWA
        if (this.isPWARelatedError(error)) {
            this.handlePWAError(error);
        } else {
            // Para outros erros, usa o comportamento padrão
            console.error('❌ [GLOBAL-ERROR] Erro não relacionado ao PWA:', error);
        }
    }

    /**
     * Verifica se o erro está relacionado ao PWA
     */
    private isPWARelatedError(error: any): boolean {
        const errorMessage = error?.message?.toLowerCase() || '';
        const errorStack = error?.stack?.toLowerCase() || '';

        // Palavras-chave que indicam erros PWA
        const pwaKeywords = [
            'service worker',
            'serviceworker',
            'ngsw',
            'cache',
            'caches',
            'manifest',
            'pwa',
            'offline',
            'sw.js',
            'workbox'
        ];

        return pwaKeywords.some(keyword => 
            errorMessage.includes(keyword) || errorStack.includes(keyword)
        );
    }

    /**
     * Trata erros relacionados ao PWA
     */
    private handlePWAError(error: any): void {
        const errorMessage = error?.message?.toLowerCase() || '';

        // Determina o tipo de erro PWA
        if (errorMessage.includes('service worker') || errorMessage.includes('ngsw')) {
            this.pwaErrorHandler.handleServiceWorkerError(error);
        } else if (errorMessage.includes('cache')) {
            this.pwaErrorHandler.handleCacheError(error, 'unknown');
        } else if (errorMessage.includes('update') || errorMessage.includes('version')) {
            this.pwaErrorHandler.handleUpdateError(error, 'check');
        } else if (errorMessage.includes('offline') || errorMessage.includes('network')) {
            this.pwaErrorHandler.handleNetworkError(error);
        } else {
            // Erro PWA genérico
            this.pwaErrorHandler.handleServiceWorkerError(error, {
                source: 'global-error-handler',
                originalError: error
            });
        }
    }
}

/**
 * Função utilitária para configurar o error handler global
 */
export function providePWAErrorHandler() {
    return {
        provide: ErrorHandler,
        useClass: PWAGlobalErrorService
    };
}