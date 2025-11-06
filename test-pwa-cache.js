#!/usr/bin/env node

/**
 * Script de teste específico para cache PWA
 * Testa estratégias de cache, eficiência e performance
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class PWACacheTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
        this.baseUrl = 'http://localhost:4200';
        this.cacheMetrics = {
            totalRequests: 0,
            cachedRequests: 0,
            networkRequests: 0,
            cacheHitRatio: 0,
            loadTimes: []
        };
    }

    /**
     * Executa todos os testes de cache
     */
    async runAllCacheTests() {
        console.log('🗄️ Iniciando testes de cache PWA...\n');

        try {
            await this.setupBrowser();
            
            await this.testInitialCachePopulation();
            await this.testCacheEfficiency();
            await this.testOfflineCaching();
            await this.testCacheStrategies();
            await this.testCacheInvalidation();
            await this.testResourcePrioritization();
            await this.measureCachePerformance();

            this.printCacheResults();
            this.generateCacheReport();

            return this.calculateCacheScore();

        } catch (error) {
            console.error('❌ Erro durante testes de cache:', error);
            return false;
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Configura navegador para testes
     */
    async setupBrowser() {
        console.log('🔧 Configurando navegador para testes de cache...');
        
        this.browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Intercepta requests para monitorar cache
        await this.page.setRequestInterception(true);
        
        this.page.on('request', (request) => {
            this.cacheMetrics.totalRequests++;
            
            // Verifica se request vem do cache
            if (request.response() && request.response().fromServiceWorker()) {
                this.cacheMetrics.cachedRequests++;
            } else {
                this.cacheMetrics.networkRequests++;
            }
            
            request.continue();
        });

        this.addResult('pass', 'Setup', 'Navegador configurado para monitoramento de cache');
    }

    /**
     * Testa população inicial do cache
     */
    async testInitialCachePopulation() {
        console.log('📥 Testando população inicial do cache...');

        try {
            // Primeira visita - popula cache
            const startTime = Date.now();
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
            const firstLoadTime = Date.now() - startTime;
            
            this.cacheMetrics.loadTimes.push({
                type: 'first_load',
                time: firstLoadTime
            });

            this.addResult('pass', 'Cache Population', `Primeira visita: ${firstLoadTime}ms`);

            // Aguarda service worker processar recursos
            await this.page.waitForTimeout(3000);

            // Verifica se cache foi populado
            const cacheInfo = await this.page.evaluate(async () => {
                if ('caches' in window) {
                    try {
                        const cacheNames = await caches.keys();
                        let totalResources = 0;
                        const cacheDetails = [];

                        for (const cacheName of cacheNames) {
                            const cache = await caches.open(cacheName);
                            const keys = await cache.keys();
                            totalResources += keys.length;
                            
                            cacheDetails.push({
                                name: cacheName,
                                resourceCount: keys.length,
                                resources: keys.map(req => ({
                                    url: req.url,
                                    method: req.method
                                }))
                            });
                        }

                        return {
                            cacheCount: cacheNames.length,
                            totalResources,
                            cacheDetails
                        };
                    } catch (error) {
                        return { error: error.message };
                    }
                } else {
                    return { error: 'Cache API não disponível' };
                }
            });

            if (cacheInfo.error) {
                this.addResult('fail', 'Cache Population', `Erro: ${cacheInfo.error}`);
            } else {
                this.addResult('pass', 'Cache Population', `${cacheInfo.cacheCount} cache(s) criado(s) com ${cacheInfo.totalResources} recursos`);
                
                // Analisa tipos de recursos em cache
                this.analyzeCachedResources(cacheInfo.cacheDetails);
            }

        } catch (error) {
            this.addResult('fail', 'Cache Population', `Erro ao testar população: ${error.message}`);
        }
    }

    /**
     * Testa eficiência do cache
     */
    async testCacheEfficiency() {
        console.log('⚡ Testando eficiência do cache...');

        try {
            // Reset métricas
            this.cacheMetrics.totalRequests = 0;
            this.cacheMetrics.cachedRequests = 0;
            this.cacheMetrics.networkRequests = 0;

            // Segunda visita - deve usar cache
            const startTime = Date.now();
            await this.page.reload({ waitUntil: 'networkidle0' });
            const secondLoadTime = Date.now() - startTime;

            this.cacheMetrics.loadTimes.push({
                type: 'cached_load',
                time: secondLoadTime
            });

            // Calcula melhoria de performance
            const firstLoad = this.cacheMetrics.loadTimes.find(l => l.type === 'first_load');
            if (firstLoad) {
                const improvement = ((firstLoad.time - secondLoadTime) / firstLoad.time) * 100;
                
                if (improvement > 30) {
                    this.addResult('pass', 'Cache Efficiency', `Melhoria significativa: ${improvement.toFixed(1)}% mais rápido`);
                } else if (improvement > 10) {
                    this.addResult('warning', 'Cache Efficiency', `Melhoria moderada: ${improvement.toFixed(1)}% mais rápido`);
                } else {
                    this.addResult('warning', 'Cache Efficiency', `Pouca melhoria: ${improvement.toFixed(1)}% mais rápido`);
                }
            }

            // Testa navegação entre páginas
            await this.testPageNavigation();

        } catch (error) {
            this.addResult('fail', 'Cache Efficiency', `Erro ao testar eficiência: ${error.message}`);
        }
    }

    /**
     * Testa navegação entre páginas
     */
    async testPageNavigation() {
        console.log('🔄 Testando cache na navegação...');

        try {
            // Encontra links para navegar
            const links = await this.page.evaluate(() => {
                const internalLinks = Array.from(document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]'));
                return internalLinks.slice(0, 3).map(link => link.href);
            });

            if (links.length === 0) {
                this.addResult('info', 'Navigation Cache', 'Nenhum link interno encontrado para teste');
                return;
            }

            for (const link of links) {
                const startTime = Date.now();
                
                try {
                    await this.page.goto(link, { waitUntil: 'networkidle0', timeout: 10000 });
                    const loadTime = Date.now() - startTime;
                    
                    this.cacheMetrics.loadTimes.push({
                        type: 'navigation',
                        time: loadTime,
                        url: link
                    });

                    if (loadTime < 1000) {
                        this.addResult('pass', 'Navigation Cache', `Navegação rápida para ${link}: ${loadTime}ms`);
                    } else {
                        this.addResult('warning', 'Navigation Cache', `Navegação lenta para ${link}: ${loadTime}ms`);
                    }

                } catch (error) {
                    this.addResult('warning', 'Navigation Cache', `Erro ao navegar para ${link}: ${error.message}`);
                }
            }

            // Volta para página inicial
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });

        } catch (error) {
            this.addResult('fail', 'Navigation Cache', `Erro na navegação: ${error.message}`);
        }
    }

    /**
     * Testa cache offline
     */
    async testOfflineCaching() {
        console.log('📡 Testando cache offline...');

        try {
            // Garante que cache está populado
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
            await this.page.waitForTimeout(2000);

            // Ativa modo offline
            await this.page.setOfflineMode(true);
            this.addResult('info', 'Offline Cache', 'Modo offline ativado');

            // Testa acesso offline
            const startTime = Date.now();
            await this.page.reload({ waitUntil: 'networkidle0', timeout: 15000 });
            const offlineLoadTime = Date.now() - startTime;

            this.cacheMetrics.loadTimes.push({
                type: 'offline_load',
                time: offlineLoadTime
            });

            this.addResult('pass', 'Offline Cache', `Página acessível offline: ${offlineLoadTime}ms`);

            // Verifica funcionalidade offline
            const offlineFunctionality = await this.page.evaluate(() => {
                // Testa se elementos principais estão presentes
                const hasNavigation = document.querySelector('nav') !== null;
                const hasContent = document.body.innerHTML.length > 1000;
                const hasStyles = getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)';

                return {
                    hasNavigation,
                    hasContent,
                    hasStyles,
                    bodyLength: document.body.innerHTML.length
                };
            });

            if (offlineFunctionality.hasNavigation && offlineFunctionality.hasContent) {
                this.addResult('pass', 'Offline Cache', 'Funcionalidade completa disponível offline');
            } else {
                this.addResult('warning', 'Offline Cache', 'Funcionalidade limitada offline');
            }

            // Restaura modo online
            await this.page.setOfflineMode(false);
            this.addResult('info', 'Offline Cache', 'Modo online restaurado');

        } catch (error) {
            await this.page.setOfflineMode(false);
            this.addResult('fail', 'Offline Cache', `Erro no teste offline: ${error.message}`);
        }
    }

    /**
     * Testa estratégias de cache
     */
    async testCacheStrategies() {
        console.log('🎯 Testando estratégias de cache...');

        try {
            // Analisa configuração do service worker
            const swConfig = await this.analyzeSWConfig();
            
            if (swConfig.error) {
                this.addResult('warning', 'Cache Strategies', `Não foi possível analisar configuração: ${swConfig.error}`);
                return;
            }

            // Testa diferentes tipos de recursos
            await this.testResourceCaching('static', ['.css', '.js', '.png', '.jpg', '.ico']);
            await this.testResourceCaching('dynamic', ['/api/', '/data/']);
            await this.testResourceCaching('navigation', ['/', '/home', '/login']);

        } catch (error) {
            this.addResult('fail', 'Cache Strategies', `Erro ao testar estratégias: ${error.message}`);
        }
    }

    /**
     * Testa cache de tipos específicos de recursos
     */
    async testResourceCaching(type, patterns) {
        console.log(`🔍 Testando cache de recursos ${type}...`);

        try {
            const cachedResources = await this.page.evaluate(async (patterns) => {
                if (!('caches' in window)) return { error: 'Cache API não disponível' };

                try {
                    const cacheNames = await caches.keys();
                    const matchedResources = [];

                    for (const cacheName of cacheNames) {
                        const cache = await caches.open(cacheName);
                        const keys = await cache.keys();

                        for (const request of keys) {
                            const url = request.url;
                            
                            for (const pattern of patterns) {
                                if (url.includes(pattern)) {
                                    matchedResources.push({
                                        url,
                                        cacheName,
                                        pattern
                                    });
                                    break;
                                }
                            }
                        }
                    }

                    return { resources: matchedResources };
                } catch (error) {
                    return { error: error.message };
                }
            }, patterns);

            if (cachedResources.error) {
                this.addResult('warning', 'Resource Caching', `Erro ao verificar recursos ${type}: ${cachedResources.error}`);
            } else {
                const count = cachedResources.resources.length;
                if (count > 0) {
                    this.addResult('pass', 'Resource Caching', `${count} recursos ${type} em cache`);
                } else {
                    this.addResult('warning', 'Resource Caching', `Nenhum recurso ${type} encontrado em cache`);
                }
            }

        } catch (error) {
            this.addResult('fail', 'Resource Caching', `Erro ao testar recursos ${type}: ${error.message}`);
        }
    }

    /**
     * Testa invalidação de cache
     */
    async testCacheInvalidation() {
        console.log('🔄 Testando invalidação de cache...');

        try {
            // Simula atualização forçada
            await this.page.keyboard.down('Shift');
            await this.page.reload({ waitUntil: 'networkidle0' });
            await this.page.keyboard.up('Shift');

            this.addResult('pass', 'Cache Invalidation', 'Atualização forçada executada');

            // Verifica se service worker foi atualizado
            const swStatus = await this.page.evaluate(() => {
                return navigator.serviceWorker.getRegistration().then(registration => {
                    if (registration) {
                        return {
                            hasWaiting: !!registration.waiting,
                            hasInstalling: !!registration.installing,
                            activeState: registration.active ? registration.active.state : 'none'
                        };
                    }
                    return { error: 'Nenhum service worker registrado' };
                });
            });

            if (swStatus.error) {
                this.addResult('warning', 'Cache Invalidation', swStatus.error);
            } else {
                if (swStatus.hasWaiting || swStatus.hasInstalling) {
                    this.addResult('info', 'Cache Invalidation', 'Service worker em processo de atualização');
                } else {
                    this.addResult('pass', 'Cache Invalidation', 'Service worker ativo e atualizado');
                }
            }

        } catch (error) {
            this.addResult('fail', 'Cache Invalidation', `Erro ao testar invalidação: ${error.message}`);
        }
    }

    /**
     * Testa priorização de recursos
     */
    async testResourcePrioritization() {
        console.log('⚡ Testando priorização de recursos...');

        try {
            // Analisa ordem de carregamento
            const loadOrder = await this.page.evaluate(() => {
                const resources = performance.getEntriesByType('resource');
                return resources.map(resource => ({
                    name: resource.name,
                    startTime: resource.startTime,
                    duration: resource.duration,
                    transferSize: resource.transferSize || 0
                })).sort((a, b) => a.startTime - b.startTime);
            });

            // Verifica se recursos críticos carregam primeiro
            const criticalResources = loadOrder.filter(resource => 
                resource.name.includes('.css') || 
                resource.name.includes('main.') ||
                resource.name.includes('polyfills.')
            );

            if (criticalResources.length > 0) {
                const avgCriticalStart = criticalResources.reduce((sum, r) => sum + r.startTime, 0) / criticalResources.length;
                const avgAllStart = loadOrder.reduce((sum, r) => sum + r.startTime, 0) / loadOrder.length;

                if (avgCriticalStart <= avgAllStart) {
                    this.addResult('pass', 'Resource Priority', 'Recursos críticos carregam com prioridade');
                } else {
                    this.addResult('warning', 'Resource Priority', 'Recursos críticos não têm prioridade clara');
                }
            } else {
                this.addResult('info', 'Resource Priority', 'Nenhum recurso crítico identificado');
            }

        } catch (error) {
            this.addResult('fail', 'Resource Priority', `Erro ao testar priorização: ${error.message}`);
        }
    }

    /**
     * Mede performance do cache
     */
    async measureCachePerformance() {
        console.log('📊 Medindo performance do cache...');

        try {
            // Calcula métricas finais
            if (this.cacheMetrics.totalRequests > 0) {
                this.cacheMetrics.cacheHitRatio = this.cacheMetrics.cachedRequests / this.cacheMetrics.totalRequests;
            }

            // Analisa tempos de carregamento
            const loadTimes = this.cacheMetrics.loadTimes;
            const avgLoadTime = loadTimes.reduce((sum, lt) => sum + lt.time, 0) / loadTimes.length;

            this.addResult('info', 'Cache Performance', `Tempo médio de carregamento: ${avgLoadTime.toFixed(0)}ms`);
            this.addResult('info', 'Cache Performance', `Cache hit ratio: ${(this.cacheMetrics.cacheHitRatio * 100).toFixed(1)}%`);

            // Avalia performance geral
            if (avgLoadTime < 1000 && this.cacheMetrics.cacheHitRatio > 0.7) {
                this.addResult('pass', 'Cache Performance', 'Performance excelente do cache');
            } else if (avgLoadTime < 3000 && this.cacheMetrics.cacheHitRatio > 0.5) {
                this.addResult('warning', 'Cache Performance', 'Performance adequada do cache');
            } else {
                this.addResult('fail', 'Cache Performance', 'Performance do cache precisa melhorar');
            }

        } catch (error) {
            this.addResult('fail', 'Cache Performance', `Erro ao medir performance: ${error.message}`);
        }
    }

    /**
     * Analisa recursos em cache
     */
    analyzeCachedResources(cacheDetails) {
        const resourceTypes = {};
        
        cacheDetails.forEach(cache => {
            cache.resources.forEach(resource => {
                const url = resource.url;
                let type = 'other';
                
                if (url.includes('.css')) type = 'css';
                else if (url.includes('.js')) type = 'js';
                else if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) type = 'images';
                else if (url.includes('.woff') || url.includes('.ttf')) type = 'fonts';
                else if (url.includes('/api/') || url.includes('.json')) type = 'api';
                else if (url.includes('.html') || url === this.baseUrl || url.endsWith('/')) type = 'html';
                
                resourceTypes[type] = (resourceTypes[type] || 0) + 1;
            });
        });

        Object.entries(resourceTypes).forEach(([type, count]) => {
            this.addResult('info', 'Resource Analysis', `${type}: ${count} recursos`);
        });
    }

    /**
     * Analisa configuração do service worker
     */
    async analyzeSWConfig() {
        try {
            if (fs.existsSync('ngsw-config.json')) {
                const config = JSON.parse(fs.readFileSync('ngsw-config.json', 'utf8'));
                return { config };
            } else {
                return { error: 'Arquivo ngsw-config.json não encontrado' };
            }
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Calcula score do cache
     */
    calculateCacheScore() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.status === 'pass').length;
        const failedTests = this.results.filter(r => r.status === 'fail').length;
        
        let score = (passedTests / totalTests) * 100;
        
        // Penaliza falhas críticas
        score -= failedTests * 10;
        
        // Bonus por performance
        if (this.cacheMetrics.cacheHitRatio > 0.8) score += 10;
        if (this.cacheMetrics.loadTimes.some(lt => lt.time < 500)) score += 5;
        
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Adiciona resultado de teste
     */
    addResult(status, category, message) {
        this.results.push({
            status,
            category,
            message,
            timestamp: new Date().toISOString()
        });

        const icon = status === 'pass' ? '✅' : 
                    status === 'fail' ? '❌' : 
                    status === 'warning' ? '⚠️' : 'ℹ️';
        
        console.log(`   ${icon} [${category}] ${message}`);
    }

    /**
     * Imprime resultados do cache
     */
    printCacheResults() {
        console.log('\n📊 RESULTADOS DOS TESTES DE CACHE');
        console.log('═'.repeat(50));
        
        const passed = this.results.filter(r => r.status === 'pass').length;
        const failed = this.results.filter(r => r.status === 'fail').length;
        const warnings = this.results.filter(r => r.status === 'warning').length;

        console.log(`✅ Passou: ${passed}`);
        console.log(`❌ Falhou: ${failed}`);
        console.log(`⚠️ Avisos: ${warnings}`);

        const score = this.calculateCacheScore();
        console.log(`\n🏆 Score de Cache: ${score}/100`);

        // Métricas de performance
        console.log('\n📈 MÉTRICAS DE PERFORMANCE:');
        console.log(`Cache Hit Ratio: ${(this.cacheMetrics.cacheHitRatio * 100).toFixed(1)}%`);
        console.log(`Total de Requests: ${this.cacheMetrics.totalRequests}`);
        console.log(`Requests em Cache: ${this.cacheMetrics.cachedRequests}`);
        console.log(`Requests de Rede: ${this.cacheMetrics.networkRequests}`);

        if (this.cacheMetrics.loadTimes.length > 0) {
            const avgTime = this.cacheMetrics.loadTimes.reduce((sum, lt) => sum + lt.time, 0) / this.cacheMetrics.loadTimes.length;
            console.log(`Tempo Médio de Load: ${avgTime.toFixed(0)}ms`);
        }
    }

    /**
     * Gera relatório de cache
     */
    generateCacheReport() {
        const report = {
            timestamp: new Date().toISOString(),
            score: this.calculateCacheScore(),
            metrics: this.cacheMetrics,
            results: this.results,
            summary: {
                totalTests: this.results.length,
                passed: this.results.filter(r => r.status === 'pass').length,
                failed: this.results.filter(r => r.status === 'fail').length,
                warnings: this.results.filter(r => r.status === 'warning').length
            }
        };

        const reportPath = 'pwa-cache-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Relatório de cache salvo em: ${reportPath}`);
    }

    /**
     * Limpa recursos
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('\n🧹 Recursos limpos');
        }
    }
}

// Executa testes se script for chamado diretamente
if (require.main === module) {
    const tester = new PWACacheTester();
    
    tester.runAllCacheTests().then(score => {
        if (score >= 70) {
            console.log('\n🎉 Testes de cache concluídos com sucesso!');
            process.exit(0);
        } else {
            console.log('\n⚠️ Cache precisa de melhorias. Score:', score);
            process.exit(1);
        }
    }).catch(error => {
        console.error('\n❌ Erro durante testes de cache:', error);
        process.exit(1);
    });
}

module.exports = PWACacheTester;