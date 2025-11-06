import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PWAErrorHandlerService, PWAError, PWAErrorStats } from '../../../services/pwa-error-handler.service';
import { PWAErrorRecoveryService, RecoveryStats } from '../../../services/pwa-error-recovery.service';

@Component({
    selector: 'app-pwa-error-status',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="pwa-error-status" *ngIf="shouldShowStatus()">
            <div class="error-indicator" [class]="getIndicatorClass()">
                <i class="fas fa-exclamation-triangle" *ngIf="hasActiveErrors()"></i>
                <i class="fas fa-check-circle" *ngIf="!hasActiveErrors()"></i>
                <span class="error-count" *ngIf="errorStats.activeErrors > 0">
                    {{ errorStats.activeErrors }}
                </span>
            </div>

            <div class="error-details" *ngIf="showDetails">
                <div class="error-summary">
                    <h6>Status PWA</h6>
                    <p>Erros ativos: {{ errorStats.activeErrors }}</p>
                    <p>Recuperações: {{ recoveryStats.successfulRecoveries }}</p>
                </div>

                <div class="recent-errors" *ngIf="recentErrors.length > 0">
                    <h6>Erros Recentes</h6>
                    <div class="error-item" *ngFor="let error of recentErrors.slice(0, 3)">
                        <span class="error-type">{{ getErrorTypeLabel(error.type) }}</span>
                        <span class="error-time">{{ getTimeAgo(error.timestamp) }}</span>
                        <button class="btn btn-sm btn-outline-primary" 
                                (click)="retryError(error)"
                                [disabled]="error.retryCount >= error.maxRetries">
                            Tentar Novamente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .pwa-error-status {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1050;
        }

        .error-indicator {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            position: relative;
            transition: all 0.3s ease;
        }

        .error-indicator:hover {
            transform: scale(1.1);
        }

        .error-indicator.success {
            background-color: #28a745;
            color: white;
        }

        .error-indicator.warning {
            background-color: #ffc107;
            color: #212529;
        }

        .error-indicator.error {
            background-color: #dc3545;
            color: white;
        }

        .error-count {
            position: absolute;
            top: -5px;
            right: -5px;
            background-color: #dc3545;
            color: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }

        .error-details {
            position: absolute;
            bottom: 50px;
            right: 0;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .error-summary h6,
        .recent-errors h6 {
            margin-bottom: 10px;
            color: #495057;
            font-size: 14px;
        }

        .error-summary p {
            margin: 5px 0;
            font-size: 12px;
            color: #6c757d;
        }

        .error-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
            font-size: 12px;
        }

        .error-item:last-child {
            border-bottom: none;
        }

        .error-type {
            font-weight: 500;
            color: #495057;
        }

        .error-time {
            color: #6c757d;
            font-size: 11px;
        }

        @media (max-width: 768px) {
            .pwa-error-status {
                bottom: 80px;
                right: 15px;
            }

            .error-details {
                min-width: 280px;
                max-width: calc(100vw - 40px);
            }
        }
    `]
})
export class PWAErrorStatusComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private errorHandler = inject(PWAErrorHandlerService);
    private recoveryService = inject(PWAErrorRecoveryService);

    errorStats: PWAErrorStats = {
        totalErrors: 0,
        resolvedErrors: 0,
        activeErrors: 0,
        errorsByType: {}
    };

    recoveryStats: RecoveryStats = {
        totalOperations: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        averageRecoveryTime: 0,
        operationsByType: {}
    };

    recentErrors: PWAError[] = [];
    showDetails = false;

    ngOnInit(): void {
        // Monitora estatísticas de erros
        this.errorHandler.errorStats$
            .pipe(takeUntil(this.destroy$))
            .subscribe(stats => {
                this.errorStats = stats;
            });

        // Monitora estatísticas de recuperação
        this.recoveryService.recoveryStats$
            .pipe(takeUntil(this.destroy$))
            .subscribe(stats => {
                this.recoveryStats = stats;
            });

        // Monitora erros recentes
        this.errorHandler.errors$
            .pipe(takeUntil(this.destroy$))
            .subscribe(errors => {
                this.recentErrors = errors.filter(e => !e.resolved).slice(0, 5);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Verifica se deve mostrar o indicador de status
     */
    shouldShowStatus(): boolean {
        // Mostra apenas se há erros ativos ou em desenvolvimento
        return this.errorStats.activeErrors > 0 || this.isDevelopmentMode();
    }

    /**
     * Verifica se há erros ativos
     */
    hasActiveErrors(): boolean {
        return this.errorStats.activeErrors > 0;
    }

    /**
     * Obtém classe CSS para o indicador
     */
    getIndicatorClass(): string {
        if (this.errorStats.activeErrors === 0) {
            return 'success';
        } else if (this.errorStats.activeErrors <= 2) {
            return 'warning';
        } else {
            return 'error';
        }
    }

    /**
     * Obtém label para tipo de erro
     */
    getErrorTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            'service-worker': 'Service Worker',
            'cache': 'Cache',
            'update': 'Atualização',
            'offline': 'Offline',
            'network': 'Rede'
        };
        return labels[type] || type;
    }

    /**
     * Obtém tempo relativo do erro
     */
    getTimeAgo(timestamp: Date): string {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) {
            return 'agora';
        } else if (minutes < 60) {
            return `${minutes}m atrás`;
        } else {
            const hours = Math.floor(minutes / 60);
            return `${hours}h atrás`;
        }
    }

    /**
     * Tenta recuperação manual de um erro
     */
    async retryError(error: PWAError): Promise<void> {
        try {
            await this.recoveryService.forceRecovery(error.type);
            console.log(`✅ [PWA-ERROR-STATUS] Recuperação manual bem-sucedida para ${error.type}`);
        } catch (recoveryError) {
            console.error(`❌ [PWA-ERROR-STATUS] Falha na recuperação manual para ${error.type}:`, recoveryError);
        }
    }

    /**
     * Alterna exibição de detalhes
     */
    toggleDetails(): void {
        this.showDetails = !this.showDetails;
    }

    /**
     * Verifica se está em modo de desenvolvimento
     */
    private isDevelopmentMode(): boolean {
        return true; // Sempre mostra em desenvolvimento, pode ser configurado
    }
}