import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PWAUpdateService } from './pwa-update.service';
import { PWAHealthCheckService } from './pwa-health-check.service';

export interface PWAValidationResult {
  category: 'manifest' | 'serviceWorker' | 'offline' | 'performance' | 'installation';
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface PWAValidationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  score: number; // 0-100
  isInstallable: boolean;
  isPWACompliant: boolean;
  results: PWAValidationResult[];
  lastValidation: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PWAValidationService {
  private updateService = inject(PWAUpdateService);
  private healthService = inject(PWAHealthCheckService);

  private validationSubject = new BehaviorSubject<PWAValidationSummary | null>(null);
  public validation$ = this.validationSubject.asObservable();

  constructor() {
    console.log('🔍 [PWA-VALIDATION] Serviço de validação PWA inicializado');
  }

  /**
   * Executa validação completa do PWA
   */
  async validatePWA(): Promise<PWAValidationSummary> {
    console.log('🔍 [PWA-VALIDATION] Iniciando validação completa do PWA...');
    
    const results: PWAValidationResult[] = [];

    try {
      // Validação do Manifest
      const manifestResults = await this.validateManifest();
      results.push(...manifestResults);

      // Validação do Service Worker
      const swResults = await this.validateServiceWorker();
      results.push(...swResults);

      // Validação de funcionalidades offline
      const offlineResults = await this.validateOfflineCapabilities();
      results.push(...offlineResults);

      // Validação de performance
      const performanceResults = await this.validatePerformance();
      results.push(...performanceResults);

      // Validação de instalação
      const installationResults = await this.validateInstallation();
      results.push(...installationResults);

      // Calcula resumo
      const summary = this.calculateSummary(results);
      
      this.validationSubject.next(summary);
      this.logValidationSummary(summary);

      return summary;
    } catch (error) {
      console.error('❌ [PWA-VALIDATION] Erro durante validação:', error);
      
      const errorResult: PWAValidationResult = {
        category: 'serviceWorker',
        test: 'Validação Geral',
        status: 'fail',
        message: 'Erro durante processo de validação',
        details: { error: error?.toString() },
        timestamp: new Date()
      };

      results.push(errorResult);
      const summary = this.calculateSummary(results);
      this.validationSubject.next(summary);
      
      return summary;
    }
  }

  /**
   * Valida o Web App Manifest
   */
  private async validateManifest(): Promise<PWAValidationResult[]> {
    const results: PWAValidationResult[] = [];

    try {
      // Verifica se manifest existe
      const manifestResponse = await fetch('/manifest.json');
      
      if (!manifestResponse.ok) {
        results.push({
          category: 'manifest',
          test: 'Manifest Accessibility',
          status: 'fail',
          message: 'Manifest.json não está acessível',
          details: { status: manifestResponse.status },
          timestamp: new Date()
        });
        return results;
      }

      const manifest = await manifestResponse.json();

      // Valida propriedades obrigatórias
      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
      
      for (const field of requiredFields) {
        if (manifest[field]) {
          results.push({
            category: 'manifest',
            test: `Manifest ${field}`,
            status: 'pass',
            message: `Campo ${field} presente no manifest`,
            details: { value: manifest[field] },
            timestamp: new Date()
          });
        } else {
          results.push({
            category: 'manifest',
            test: `Manifest ${field}`,
            status: 'fail',
            message: `Campo obrigatório ${field} ausente no manifest`,
            timestamp: new Date()
          });
        }
      }

      // Valida ícones
      if (manifest.icons && Array.isArray(manifest.icons)) {
        const hasRequiredSizes = manifest.icons.some((icon: any) => 
          icon.sizes === '192x192' || icon.sizes === '512x512'
        );

        results.push({
          category: 'manifest',
          test: 'Manifest Icons',
          status: hasRequiredSizes ? 'pass' : 'warning',
          message: hasRequiredSizes 
            ? 'Ícones com tamanhos adequados encontrados'
            : 'Recomenda-se ícones de 192x192 e 512x512',
          details: { icons: manifest.icons.map((i: any) => i.sizes) },
          timestamp: new Date()
        });
      }

      // Valida display mode
      const validDisplayModes = ['standalone', 'fullscreen', 'minimal-ui'];
      const isValidDisplay = validDisplayModes.includes(manifest.display);

      results.push({
        category: 'manifest',
        test: 'Manifest Display Mode',
        status: isValidDisplay ? 'pass' : 'warning',
        message: isValidDisplay 
          ? `Display mode ${manifest.display} é adequado para PWA`
          : `Display mode ${manifest.display} pode não oferecer experiência nativa`,
        details: { display: manifest.display },
        timestamp: new Date()
      });

      // Valida theme_color
      if (manifest.theme_color) {
        results.push({
          category: 'manifest',
          test: 'Manifest Theme Color',
          status: 'pass',
          message: 'Theme color definido',
          details: { theme_color: manifest.theme_color },
          timestamp: new Date()
        });
      }

    } catch (error) {
      results.push({
        category: 'manifest',
        test: 'Manifest Parsing',
        status: 'fail',
        message: 'Erro ao processar manifest.json',
        details: { error: error?.toString() },
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Valida o Service Worker
   */
  private async validateServiceWorker(): Promise<PWAValidationResult[]> {
    const results: PWAValidationResult[] = [];

    // Verifica suporte do navegador
    if (!('serviceWorker' in navigator)) {
      results.push({
        category: 'serviceWorker',
        test: 'Browser Support',
        status: 'fail',
        message: 'Navegador não suporta Service Workers',
        timestamp: new Date()
      });
      return results;
    }

    results.push({
      category: 'serviceWorker',
      test: 'Browser Support',
      status: 'pass',
      message: 'Navegador suporta Service Workers',
      timestamp: new Date()
    });

    try {
      // Verifica registro do service worker
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        results.push({
          category: 'serviceWorker',
          test: 'Service Worker Registration',
          status: 'pass',
          message: 'Service Worker está registrado',
          details: { scope: registration.scope },
          timestamp: new Date()
        });

        // Verifica se está ativo
        if (registration.active) {
          results.push({
            category: 'serviceWorker',
            test: 'Service Worker Active',
            status: 'pass',
            message: 'Service Worker está ativo',
            details: { state: registration.active.state },
            timestamp: new Date()
          });
        } else {
          results.push({
            category: 'serviceWorker',
            test: 'Service Worker Active',
            status: 'warning',
            message: 'Service Worker registrado mas não ativo',
            timestamp: new Date()
          });
        }

        // Verifica sistema de atualizações
        const updateEnabled = this.updateService.isServiceWorkerEnabled();
        results.push({
          category: 'serviceWorker',
          test: 'Update System',
          status: updateEnabled ? 'pass' : 'warning',
          message: updateEnabled 
            ? 'Sistema de atualizações funcionando'
            : 'Sistema de atualizações não está habilitado',
          timestamp: new Date()
        });

      } else {
        results.push({
          category: 'serviceWorker',
          test: 'Service Worker Registration',
          status: 'fail',
          message: 'Service Worker não está registrado',
          timestamp: new Date()
        });
      }

    } catch (error) {
      results.push({
        category: 'serviceWorker',
        test: 'Service Worker Check',
        status: 'fail',
        message: 'Erro ao verificar Service Worker',
        details: { error: error?.toString() },
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Valida capacidades offline
   */
  private async validateOfflineCapabilities(): Promise<PWAValidationResult[]> {
    const results: PWAValidationResult[] = [];

    try {
      // Verifica suporte a Cache API
      if ('caches' in window) {
        results.push({
          category: 'offline',
          test: 'Cache API Support',
          status: 'pass',
          message: 'Cache API está disponível',
          timestamp: new Date()
        });

        // Verifica caches existentes
        const cacheNames = await caches.keys();
        
        if (cacheNames.length > 0) {
          results.push({
            category: 'offline',
            test: 'Cache Storage',
            status: 'pass',
            message: `${cacheNames.length} cache(s) encontrado(s)`,
            details: { caches: cacheNames },
            timestamp: new Date()
          });

          // Verifica cache da aplicação
          const hasAppCache = cacheNames.some(name => 
            name.includes('ngsw') || name.includes('app')
          );

          results.push({
            category: 'offline',
            test: 'App Cache',
            status: hasAppCache ? 'pass' : 'warning',
            message: hasAppCache 
              ? 'Cache da aplicação encontrado'
              : 'Cache da aplicação não encontrado',
            timestamp: new Date()
          });

        } else {
          results.push({
            category: 'offline',
            test: 'Cache Storage',
            status: 'warning',
            message: 'Nenhum cache encontrado',
            timestamp: new Date()
          });
        }

      } else {
        results.push({
          category: 'offline',
          test: 'Cache API Support',
          status: 'fail',
          message: 'Cache API não está disponível',
          timestamp: new Date()
        });
      }

      // Testa funcionalidade offline básica
      const offlineTest = await this.testOfflineFunctionality();
      results.push(offlineTest);

    } catch (error) {
      results.push({
        category: 'offline',
        test: 'Offline Capabilities',
        status: 'fail',
        message: 'Erro ao verificar capacidades offline',
        details: { error: error?.toString() },
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Testa funcionalidade offline básica
   */
  private async testOfflineFunctionality(): Promise<PWAValidationResult> {
    try {
      // Tenta acessar um recurso que deveria estar em cache
      const testUrl = '/favicon.ico';
      const response = await fetch(testUrl);

      if (response.ok) {
        return {
          category: 'offline',
          test: 'Offline Resource Access',
          status: 'pass',
          message: 'Recursos básicos acessíveis (provavelmente em cache)',
          details: { url: testUrl, status: response.status },
          timestamp: new Date()
        };
      } else {
        return {
          category: 'offline',
          test: 'Offline Resource Access',
          status: 'warning',
          message: 'Recurso básico não acessível',
          details: { url: testUrl, status: response.status },
          timestamp: new Date()
        };
      }
    } catch (error) {
      return {
        category: 'offline',
        test: 'Offline Resource Access',
        status: 'info',
        message: 'Não foi possível testar acesso offline (pode estar offline)',
        details: { error: error?.toString() },
        timestamp: new Date()
      };
    }
  }

  /**
   * Valida performance do PWA
   */
  private async validatePerformance(): Promise<PWAValidationResult[]> {
    const results: PWAValidationResult[] = [];

    try {
      // Verifica Performance API
      if ('performance' in window && performance.timing) {
        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;

        results.push({
          category: 'performance',
          test: 'Page Load Time',
          status: loadTime < 3000 ? 'pass' : loadTime < 5000 ? 'warning' : 'fail',
          message: `Tempo de carregamento: ${loadTime}ms`,
          details: { loadTime },
          timestamp: new Date()
        });

        // Verifica tempo de resposta do service worker
        if (timing.responseStart && timing.requestStart) {
          const responseTime = timing.responseStart - timing.requestStart;
          
          results.push({
            category: 'performance',
            test: 'Response Time',
            status: responseTime < 200 ? 'pass' : responseTime < 500 ? 'warning' : 'fail',
            message: `Tempo de resposta: ${responseTime}ms`,
            details: { responseTime },
            timestamp: new Date()
          });
        }
      }

      // Verifica cache hit ratio (estimativa)
      const cacheEfficiency = await this.estimateCacheEfficiency();
      results.push(cacheEfficiency);

    } catch (error) {
      results.push({
        category: 'performance',
        test: 'Performance Analysis',
        status: 'warning',
        message: 'Não foi possível analisar performance completamente',
        details: { error: error?.toString() },
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Estima eficiência do cache
   */
  private async estimateCacheEfficiency(): Promise<PWAValidationResult> {
    try {
      const cacheNames = await caches.keys();
      let totalCachedResources = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        totalCachedResources += keys.length;
      }

      return {
        category: 'performance',
        test: 'Cache Efficiency',
        status: totalCachedResources > 10 ? 'pass' : totalCachedResources > 5 ? 'warning' : 'info',
        message: `${totalCachedResources} recursos em cache`,
        details: { cachedResources: totalCachedResources, caches: cacheNames.length },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        category: 'performance',
        test: 'Cache Efficiency',
        status: 'warning',
        message: 'Não foi possível verificar eficiência do cache',
        details: { error: error?.toString() },
        timestamp: new Date()
      };
    }
  }

  /**
   * Valida capacidade de instalação
   */
  private async validateInstallation(): Promise<PWAValidationResult[]> {
    const results: PWAValidationResult[] = [];

    try {
      // Verifica se está rodando em HTTPS
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      
      results.push({
        category: 'installation',
        test: 'HTTPS Requirement',
        status: isSecure ? 'pass' : 'fail',
        message: isSecure 
          ? 'Aplicação servida via HTTPS'
          : 'PWA requer HTTPS para instalação',
        details: { protocol: location.protocol, hostname: location.hostname },
        timestamp: new Date()
      });

      // Verifica se já está instalado
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;

      results.push({
        category: 'installation',
        test: 'Installation Status',
        status: 'info',
        message: isStandalone 
          ? 'Aplicação está rodando como PWA instalado'
          : 'Aplicação está rodando no navegador',
        details: { isStandalone },
        timestamp: new Date()
      });

      // Verifica critérios de instalação
      const installCriteria = await this.checkInstallationCriteria();
      results.push(...installCriteria);

    } catch (error) {
      results.push({
        category: 'installation',
        test: 'Installation Validation',
        status: 'fail',
        message: 'Erro ao verificar critérios de instalação',
        details: { error: error?.toString() },
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Verifica critérios de instalação do PWA
   */
  private async checkInstallationCriteria(): Promise<PWAValidationResult[]> {
    const results: PWAValidationResult[] = [];

    // Lista de critérios para instalação
    const criteria = [
      {
        name: 'Service Worker',
        check: async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return !!registration?.active;
        }
      },
      {
        name: 'Web App Manifest',
        check: async () => {
          try {
            const response = await fetch('/manifest.json');
            return response.ok;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'HTTPS',
        check: async () => {
          return location.protocol === 'https:' || location.hostname === 'localhost';
        }
      }
    ];

    for (const criterion of criteria) {
      try {
        const passed = await criterion.check();
        
        results.push({
          category: 'installation',
          test: `Installation Criterion: ${criterion.name}`,
          status: passed ? 'pass' : 'fail',
          message: passed 
            ? `${criterion.name} atende critério de instalação`
            : `${criterion.name} não atende critério de instalação`,
          timestamp: new Date()
        });
      } catch (error) {
        results.push({
          category: 'installation',
          test: `Installation Criterion: ${criterion.name}`,
          status: 'fail',
          message: `Erro ao verificar ${criterion.name}`,
          details: { error: error?.toString() },
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Calcula resumo da validação
   */
  private calculateSummary(results: PWAValidationResult[]): PWAValidationSummary {
    const totalTests = results.length;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;

    // Calcula score (0-100)
    const score = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

    // Verifica se é instalável (critérios básicos)
    const hasServiceWorker = results.some(r => 
      r.test.includes('Service Worker') && r.status === 'pass'
    );
    const hasManifest = results.some(r => 
      r.test.includes('Manifest') && r.status === 'pass'
    );
    const hasHTTPS = results.some(r => 
      r.test.includes('HTTPS') && r.status === 'pass'
    );

    const isInstallable = hasServiceWorker && hasManifest && hasHTTPS;
    const isPWACompliant = score >= 80 && failed === 0;

    return {
      totalTests,
      passed,
      failed,
      warnings,
      score,
      isInstallable,
      isPWACompliant,
      results,
      lastValidation: new Date()
    };
  }

  /**
   * Faz log do resumo da validação
   */
  private logValidationSummary(summary: PWAValidationSummary): void {
    console.log('📊 [PWA-VALIDATION] Resumo da Validação:');
    console.log(`   Score: ${summary.score}/100`);
    console.log(`   Testes: ${summary.totalTests} total`);
    console.log(`   ✅ Passou: ${summary.passed}`);
    console.log(`   ❌ Falhou: ${summary.failed}`);
    console.log(`   ⚠️ Avisos: ${summary.warnings}`);
    console.log(`   📱 Instalável: ${summary.isInstallable ? 'Sim' : 'Não'}`);
    console.log(`   🏆 PWA Compliant: ${summary.isPWACompliant ? 'Sim' : 'Não'}`);

    if (summary.failed > 0) {
      console.warn('❌ [PWA-VALIDATION] Testes que falharam:');
      summary.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.warn(`   - ${r.test}: ${r.message}`));
    }

    if (summary.warnings > 0) {
      console.warn('⚠️ [PWA-VALIDATION] Avisos:');
      summary.results
        .filter(r => r.status === 'warning')
        .forEach(r => console.warn(`   - ${r.test}: ${r.message}`));
    }
  }

  /**
   * Obtém resultado da última validação
   */
  getCurrentValidation(): PWAValidationSummary | null {
    return this.validationSubject.value;
  }

  /**
   * Verifica se PWA está em conformidade
   */
  isPWACompliant(): boolean {
    const validation = this.validationSubject.value;
    return validation?.isPWACompliant ?? false;
  }

  /**
   * Verifica se PWA é instalável
   */
  isInstallable(): boolean {
    const validation = this.validationSubject.value;
    return validation?.isInstallable ?? false;
  }

  /**
   * Obtém recomendações baseadas na validação
   */
  getRecommendations(): string[] {
    const validation = this.validationSubject.value;
    if (!validation) return [];

    const recommendations: string[] = [];

    // Recomendações baseadas em falhas
    const failures = validation.results.filter(r => r.status === 'fail');
    
    failures.forEach(failure => {
      switch (failure.category) {
        case 'manifest':
          recommendations.push(`Corrigir problema no manifest: ${failure.message}`);
          break;
        case 'serviceWorker':
          recommendations.push(`Resolver problema do Service Worker: ${failure.message}`);
          break;
        case 'offline':
          recommendations.push(`Melhorar suporte offline: ${failure.message}`);
          break;
        case 'performance':
          recommendations.push(`Otimizar performance: ${failure.message}`);
          break;
        case 'installation':
          recommendations.push(`Resolver problema de instalação: ${failure.message}`);
          break;
      }
    });

    // Recomendações baseadas em avisos
    const warnings = validation.results.filter(r => r.status === 'warning');
    
    if (warnings.length > 0) {
      recommendations.push('Considere resolver os avisos para melhorar a experiência PWA');
    }

    if (validation.score < 80) {
      recommendations.push('Score PWA abaixo de 80% - considere implementar melhorias');
    }

    return recommendations;
  }
}