#!/usr/bin/env node

/**
 * Script de validação PWA para EV Advocacia Criminal
 * Executa testes automatizados para verificar conformidade PWA
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class PWAValidator {
    constructor() {
        this.results = [];
        this.score = 0;
        this.totalTests = 0;
    }

    /**
     * Executa todos os testes de validação
     */
    async runAllTests() {
        console.log('🔍 Iniciando validação PWA...\n');

        try {
            await this.validateManifest();
            await this.validateServiceWorkerConfig();
            await this.validateIcons();
            await this.validateHTMLMeta();
            await this.validateBuildConfiguration();

            this.calculateScore();
            this.printResults();
            this.printRecommendations();

            return this.score >= 80;
        } catch (error) {
            console.error('❌ Erro durante validação:', error);
            return false;
        }
    }

    /**
     * Valida o Web App Manifest
     */
    async validateManifest() {
        console.log('📱 Validando Web App Manifest...');

        const manifestPaths = ['src/manifest.json', 'src/manifest.webmanifest'];
        let manifestFound = false;

        for (const manifestPath of manifestPaths) {
            if (fs.existsSync(manifestPath)) {
                manifestFound = true;
                await this.validateManifestFile(manifestPath);
                break;
            }
        }

        if (!manifestFound) {
            this.addResult('fail', 'Manifest', 'Arquivo manifest não encontrado');
        }
    }

    /**
     * Valida arquivo de manifest específico
     */
    async validateManifestFile(manifestPath) {
        try {
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            // Campos obrigatórios
            const requiredFields = [
                { field: 'name', message: 'Nome da aplicação' },
                { field: 'short_name', message: 'Nome curto' },
                { field: 'start_url', message: 'URL de início' },
                { field: 'display', message: 'Modo de exibição' },
                { field: 'icons', message: 'Ícones da aplicação' }
            ];

            requiredFields.forEach(({ field, message }) => {
                if (manifest[field]) {
                    this.addResult('pass', 'Manifest', `${message} presente`);
                } else {
                    this.addResult('fail', 'Manifest', `${message} ausente`);
                }
            });

            // Valida display mode
            const validDisplayModes = ['standalone', 'fullscreen', 'minimal-ui'];
            if (manifest.display && validDisplayModes.includes(manifest.display)) {
                this.addResult('pass', 'Manifest', `Display mode '${manifest.display}' adequado para PWA`);
            } else {
                this.addResult('warning', 'Manifest', `Display mode '${manifest.display}' pode não oferecer experiência nativa`);
            }

            // Valida ícones
            if (manifest.icons && Array.isArray(manifest.icons)) {
                const hasRequiredSizes = manifest.icons.some(icon => 
                    icon.sizes === '192x192' || icon.sizes === '512x512'
                );

                if (hasRequiredSizes) {
                    this.addResult('pass', 'Manifest', 'Ícones com tamanhos adequados (192x192, 512x512)');
                } else {
                    this.addResult('warning', 'Manifest', 'Recomenda-se ícones de 192x192 e 512x512');
                }

                // Verifica se ícones têm purpose maskable
                const hasMaskableIcons = manifest.icons.some(icon => 
                    icon.purpose && icon.purpose.includes('maskable')
                );

                if (hasMaskableIcons) {
                    this.addResult('pass', 'Manifest', 'Ícones maskable encontrados');
                } else {
                    this.addResult('warning', 'Manifest', 'Considere adicionar ícones maskable para Android');
                }
            }

            // Valida theme_color
            if (manifest.theme_color) {
                this.addResult('pass', 'Manifest', 'Theme color definido');
            } else {
                this.addResult('warning', 'Manifest', 'Theme color não definido');
            }

            // Valida background_color
            if (manifest.background_color) {
                this.addResult('pass', 'Manifest', 'Background color definido');
            } else {
                this.addResult('warning', 'Manifest', 'Background color não definido');
            }

        } catch (error) {
            this.addResult('fail', 'Manifest', `Erro ao processar manifest: ${error.message}`);
        }
    }

    /**
     * Valida configuração do Service Worker
     */
    async validateServiceWorkerConfig() {
        console.log('🔧 Validando configuração do Service Worker...');

        // Verifica se ngsw-config.json existe
        if (fs.existsSync('ngsw-config.json')) {
            this.addResult('pass', 'Service Worker', 'Arquivo ngsw-config.json encontrado');

            try {
                const configContent = fs.readFileSync('ngsw-config.json', 'utf8');
                const config = JSON.parse(configContent);

                // Valida estrutura básica
                if (config.index) {
                    this.addResult('pass', 'Service Worker', 'Index definido na configuração');
                } else {
                    this.addResult('fail', 'Service Worker', 'Index não definido na configuração');
                }

                // Valida asset groups
                if (config.assetGroups && Array.isArray(config.assetGroups)) {
                    this.addResult('pass', 'Service Worker', `${config.assetGroups.length} grupos de assets configurados`);

                    // Verifica se há grupo para app
                    const hasAppGroup = config.assetGroups.some(group => group.name === 'app');
                    if (hasAppGroup) {
                        this.addResult('pass', 'Service Worker', 'Grupo de assets da aplicação configurado');
                    } else {
                        this.addResult('warning', 'Service Worker', 'Grupo de assets da aplicação não encontrado');
                    }

                    // Verifica se há grupo para assets
                    const hasAssetsGroup = config.assetGroups.some(group => group.name === 'assets');
                    if (hasAssetsGroup) {
                        this.addResult('pass', 'Service Worker', 'Grupo de assets estáticos configurado');
                    } else {
                        this.addResult('warning', 'Service Worker', 'Grupo de assets estáticos não encontrado');
                    }
                }

                // Valida data groups
                if (config.dataGroups && Array.isArray(config.dataGroups)) {
                    this.addResult('pass', 'Service Worker', `${config.dataGroups.length} grupos de dados configurados`);

                    // Verifica configuração para Firebase
                    const hasFirebaseGroup = config.dataGroups.some(group => 
                        group.urls && group.urls.some(url => url.includes('firestore.googleapis.com'))
                    );

                    if (hasFirebaseGroup) {
                        this.addResult('pass', 'Service Worker', 'Cache configurado para Firebase APIs');
                    } else {
                        this.addResult('warning', 'Service Worker', 'Cache para Firebase APIs não configurado');
                    }
                }

            } catch (error) {
                this.addResult('fail', 'Service Worker', `Erro ao processar ngsw-config.json: ${error.message}`);
            }
        } else {
            this.addResult('fail', 'Service Worker', 'Arquivo ngsw-config.json não encontrado');
        }
    }

    /**
     * Valida ícones PWA
     */
    async validateIcons() {
        console.log('🎨 Validando ícones PWA...');

        const iconSizes = ['72', '96', '128', '144', '152', '192', '384', '512'];
        const iconsPath = 'src/assets/icons';

        if (fs.existsSync(iconsPath)) {
            this.addResult('pass', 'Icons', 'Diretório de ícones encontrado');

            let foundIcons = 0;
            iconSizes.forEach(size => {
                const iconPath = path.join(iconsPath, `LogoEvac${size}.png`);
                if (fs.existsSync(iconPath)) {
                    foundIcons++;
                } else {
                    this.addResult('warning', 'Icons', `Ícone ${size}x${size} não encontrado`);
                }
            });

            if (foundIcons >= 6) {
                this.addResult('pass', 'Icons', `${foundIcons}/${iconSizes.length} ícones encontrados`);
            } else {
                this.addResult('warning', 'Icons', `Apenas ${foundIcons}/${iconSizes.length} ícones encontrados`);
            }

            // Verifica ícones críticos
            const criticalSizes = ['192', '512'];
            const hasCriticalIcons = criticalSizes.every(size => 
                fs.existsSync(path.join(iconsPath, `LogoEvac${size}.png`))
            );

            if (hasCriticalIcons) {
                this.addResult('pass', 'Icons', 'Ícones críticos (192x192, 512x512) presentes');
            } else {
                this.addResult('fail', 'Icons', 'Ícones críticos (192x192, 512x512) ausentes');
            }

        } else {
            this.addResult('fail', 'Icons', 'Diretório de ícones não encontrado');
        }
    }

    /**
     * Valida meta tags HTML
     */
    async validateHTMLMeta() {
        console.log('📄 Validando meta tags HTML...');

        if (fs.existsSync('src/index.html')) {
            const htmlContent = fs.readFileSync('src/index.html', 'utf8');

            // Meta tags essenciais para PWA
            const requiredMetas = [
                { tag: 'viewport', message: 'Meta viewport' },
                { tag: 'theme-color', message: 'Theme color' },
                { tag: 'apple-mobile-web-app-capable', message: 'iOS web app capable' },
                { tag: 'apple-mobile-web-app-status-bar-style', message: 'iOS status bar style' }
            ];

            requiredMetas.forEach(({ tag, message }) => {
                if (htmlContent.includes(`name="${tag}"`) || htmlContent.includes(`property="${tag}"`)) {
                    this.addResult('pass', 'HTML Meta', `${message} presente`);
                } else {
                    this.addResult('warning', 'HTML Meta', `${message} ausente`);
                }
            });

            // Verifica link para manifest
            if (htmlContent.includes('rel="manifest"')) {
                this.addResult('pass', 'HTML Meta', 'Link para manifest presente');
            } else {
                this.addResult('fail', 'HTML Meta', 'Link para manifest ausente');
            }

            // Verifica apple-touch-icon
            if (htmlContent.includes('rel="apple-touch-icon"')) {
                this.addResult('pass', 'HTML Meta', 'Apple touch icon configurado');
            } else {
                this.addResult('warning', 'HTML Meta', 'Apple touch icon não configurado');
            }

        } else {
            this.addResult('fail', 'HTML Meta', 'Arquivo index.html não encontrado');
        }
    }

    /**
     * Valida configuração de build
     */
    async validateBuildConfiguration() {
        console.log('⚙️ Validando configuração de build...');

        if (fs.existsSync('angular.json')) {
            try {
                const angularConfig = JSON.parse(fs.readFileSync('angular.json', 'utf8'));
                const buildOptions = angularConfig.projects?.evadvociacriminal?.architect?.build?.options;

                if (buildOptions) {
                    // Verifica se service worker está habilitado
                    if (buildOptions.serviceWorker === true) {
                        this.addResult('pass', 'Build Config', 'Service Worker habilitado no build');
                    } else {
                        this.addResult('fail', 'Build Config', 'Service Worker não habilitado no build');
                    }

                    // Verifica configuração do service worker
                    if (buildOptions.ngswConfigPath) {
                        this.addResult('pass', 'Build Config', 'Caminho para ngsw-config configurado');
                    } else {
                        this.addResult('warning', 'Build Config', 'Caminho para ngsw-config não configurado');
                    }

                    // Verifica assets
                    if (buildOptions.assets && Array.isArray(buildOptions.assets)) {
                        const hasManifest = buildOptions.assets.some(asset => 
                            typeof asset === 'string' && asset.includes('manifest')
                        );

                        if (hasManifest) {
                            this.addResult('pass', 'Build Config', 'Manifest incluído nos assets');
                        } else {
                            this.addResult('warning', 'Build Config', 'Manifest pode não estar incluído nos assets');
                        }

                        const hasIcons = buildOptions.assets.some(asset => 
                            typeof asset === 'object' && asset.input && asset.input.includes('icons')
                        );

                        if (hasIcons) {
                            this.addResult('pass', 'Build Config', 'Ícones incluídos nos assets');
                        } else {
                            this.addResult('warning', 'Build Config', 'Ícones podem não estar incluídos nos assets');
                        }
                    }

                    // Verifica configuração de produção
                    const prodConfig = angularConfig.projects?.evadvociacriminal?.architect?.build?.configurations?.production;
                    if (prodConfig) {
                        this.addResult('pass', 'Build Config', 'Configuração de produção encontrada');

                        // Verifica budgets
                        if (prodConfig.budgets && Array.isArray(prodConfig.budgets)) {
                            const hasServiceWorkerBudget = prodConfig.budgets.some(budget => 
                                budget.name === 'ngsw-worker'
                            );

                            if (hasServiceWorkerBudget) {
                                this.addResult('pass', 'Build Config', 'Budget para Service Worker configurado');
                            } else {
                                this.addResult('info', 'Build Config', 'Budget para Service Worker não configurado');
                            }
                        }
                    }
                }

            } catch (error) {
                this.addResult('fail', 'Build Config', `Erro ao processar angular.json: ${error.message}`);
            }
        } else {
            this.addResult('fail', 'Build Config', 'Arquivo angular.json não encontrado');
        }
    }

    /**
     * Valida ícones PWA
     */
    async validateIcons() {
        console.log('🎨 Validando ícones PWA...');

        const iconsPath = 'src/assets/icons';
        const requiredSizes = ['72', '96', '128', '144', '152', '192', '384', '512'];

        if (fs.existsSync(iconsPath)) {
            this.addResult('pass', 'Icons', 'Diretório de ícones encontrado');

            let foundIcons = 0;
            requiredSizes.forEach(size => {
                const iconPath = path.join(iconsPath, `LogoEvac${size}.png`);
                if (fs.existsSync(iconPath)) {
                    foundIcons++;

                    // Verifica tamanho do arquivo (deve ser > 1KB para ser válido)
                    const stats = fs.statSync(iconPath);
                    if (stats.size > 1024) {
                        this.addResult('pass', 'Icons', `Ícone ${size}x${size} válido (${Math.round(stats.size/1024)}KB)`);
                    } else {
                        this.addResult('warning', 'Icons', `Ícone ${size}x${size} muito pequeno (${stats.size} bytes)`);
                    }
                } else {
                    this.addResult('warning', 'Icons', `Ícone ${size}x${size} não encontrado`);
                }
            });

            // Score baseado na quantidade de ícones encontrados
            const iconScore = (foundIcons / requiredSizes.length) * 100;
            if (iconScore >= 75) {
                this.addResult('pass', 'Icons', `${foundIcons}/${requiredSizes.length} ícones encontrados (${iconScore.toFixed(0)}%)`);
            } else {
                this.addResult('warning', 'Icons', `Apenas ${foundIcons}/${requiredSizes.length} ícones encontrados (${iconScore.toFixed(0)}%)`);
            }

        } else {
            this.addResult('fail', 'Icons', 'Diretório de ícones não encontrado');
        }
    }

    /**
     * Valida meta tags HTML
     */
    async validateHTMLMeta() {
        console.log('📄 Validando meta tags HTML...');

        if (fs.existsSync('src/index.html')) {
            const htmlContent = fs.readFileSync('src/index.html', 'utf8');

            // Meta tags essenciais
            const essentialMetas = [
                { pattern: /name="viewport"/, message: 'Meta viewport' },
                { pattern: /name="theme-color"/, message: 'Theme color' },
                { pattern: /rel="manifest"/, message: 'Link para manifest' },
                { pattern: /name="apple-mobile-web-app-capable"/, message: 'iOS web app capable' }
            ];

            essentialMetas.forEach(({ pattern, message }) => {
                if (pattern.test(htmlContent)) {
                    this.addResult('pass', 'HTML Meta', `${message} presente`);
                } else {
                    this.addResult('warning', 'HTML Meta', `${message} ausente`);
                }
            });

            // Verifica apple-touch-icon
            const appleIconMatches = htmlContent.match(/rel="apple-touch-icon"/g);
            if (appleIconMatches && appleIconMatches.length > 0) {
                this.addResult('pass', 'HTML Meta', `${appleIconMatches.length} apple-touch-icon(s) configurado(s)`);
            } else {
                this.addResult('warning', 'HTML Meta', 'Apple touch icons não configurados');
            }

            // Verifica splash screens para iOS
            if (htmlContent.includes('apple-touch-startup-image')) {
                this.addResult('pass', 'HTML Meta', 'Splash screens iOS configurados');
            } else {
                this.addResult('info', 'HTML Meta', 'Splash screens iOS não configurados');
            }

        } else {
            this.addResult('fail', 'HTML Meta', 'Arquivo index.html não encontrado');
        }
    }

    /**
     * Adiciona resultado de teste
     */
    addResult(status, category, message, details = null) {
        this.results.push({
            status,
            category,
            message,
            details,
            timestamp: new Date().toISOString()
        });
        this.totalTests++;

        const icon = status === 'pass' ? '✅' : 
                    status === 'fail' ? '❌' : 
                    status === 'warning' ? '⚠️' : 'ℹ️';
        
        console.log(`   ${icon} [${category}] ${message}`);
    }

    /**
     * Calcula score final
     */
    calculateScore() {
        const passed = this.results.filter(r => r.status === 'pass').length;
        const failed = this.results.filter(r => r.status === 'fail').length;
        
        // Score baseado em testes que passaram, com penalidade para falhas
        this.score = this.totalTests > 0 ? 
            Math.max(0, Math.round(((passed - failed * 0.5) / this.totalTests) * 100)) : 0;
    }

    /**
     * Imprime resultados finais
     */
    printResults() {
        console.log('\n📊 RESUMO DA VALIDAÇÃO PWA');
        console.log('═'.repeat(50));
        
        const passed = this.results.filter(r => r.status === 'pass').length;
        const failed = this.results.filter(r => r.status === 'fail').length;
        const warnings = this.results.filter(r => r.status === 'warning').length;
        const info = this.results.filter(r => r.status === 'info').length;

        console.log(`Score PWA: ${this.score}/100`);
        console.log(`Total de testes: ${this.totalTests}`);
        console.log(`✅ Passou: ${passed}`);
        console.log(`❌ Falhou: ${failed}`);
        console.log(`⚠️ Avisos: ${warnings}`);
        console.log(`ℹ️ Info: ${info}`);

        // Status geral
        let status, emoji;
        if (this.score >= 90) {
            status = 'EXCELENTE';
            emoji = '🏆';
        } else if (this.score >= 80) {
            status = 'BOM';
            emoji = '✅';
        } else if (this.score >= 60) {
            status = 'PRECISA MELHORAR';
            emoji = '⚠️';
        } else {
            status = 'RUIM';
            emoji = '❌';
        }

        console.log(`\n${emoji} Status PWA: ${status}`);

        // Verifica se é instalável
        const hasManifest = this.results.some(r => r.category === 'Manifest' && r.status === 'pass');
        const hasServiceWorker = this.results.some(r => r.category === 'Service Worker' && r.status === 'pass');
        const hasIcons = this.results.some(r => r.category === 'Icons' && r.message.includes('críticos') && r.status === 'pass');

        const isInstallable = hasManifest && hasServiceWorker && hasIcons;
        console.log(`📱 Instalável: ${isInstallable ? 'SIM' : 'NÃO'}`);
    }

    /**
     * Imprime recomendações
     */
    printRecommendations() {
        console.log('\n💡 RECOMENDAÇÕES');
        console.log('═'.repeat(50));

        const failures = this.results.filter(r => r.status === 'fail');
        const warnings = this.results.filter(r => r.status === 'warning');

        if (failures.length === 0 && warnings.length === 0) {
            console.log('🎉 Parabéns! Sua PWA está em excelente estado!');
            return;
        }

        if (failures.length > 0) {
            console.log('\n🚨 PROBLEMAS CRÍTICOS (devem ser corrigidos):');
            failures.forEach((failure, index) => {
                console.log(`${index + 1}. [${failure.category}] ${failure.message}`);
            });
        }

        if (warnings.length > 0) {
            console.log('\n⚠️ MELHORIAS RECOMENDADAS:');
            warnings.forEach((warning, index) => {
                console.log(`${index + 1}. [${warning.category}] ${warning.message}`);
            });
        }

        // Recomendações gerais baseadas no score
        console.log('\n🎯 PRÓXIMOS PASSOS:');
        
        if (this.score < 60) {
            console.log('1. Foque em corrigir os problemas críticos primeiro');
            console.log('2. Implemente os componentes PWA básicos (manifest, service worker, ícones)');
            console.log('3. Execute este teste novamente após as correções');
        } else if (this.score < 80) {
            console.log('1. Corrija os problemas críticos restantes');
            console.log('2. Considere implementar as melhorias recomendadas');
            console.log('3. Teste a instalação em diferentes dispositivos');
        } else {
            console.log('1. Considere implementar as melhorias recomendadas para otimização');
            console.log('2. Teste em diferentes dispositivos e navegadores');
            console.log('3. Monitore performance em produção');
        }
    }

    /**
     * Salva resultados em arquivo JSON
     */
    saveResults() {
        const reportData = {
            timestamp: new Date().toISOString(),
            score: this.score,
            totalTests: this.totalTests,
            summary: {
                passed: this.results.filter(r => r.status === 'pass').length,
                failed: this.results.filter(r => r.status === 'fail').length,
                warnings: this.results.filter(r => r.status === 'warning').length,
                info: this.results.filter(r => r.status === 'info').length
            },
            results: this.results
        };

        const reportPath = 'pwa-validation-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        console.log(`\n📄 Relatório salvo em: ${reportPath}`);
    }
}

// Executa validação se script for chamado diretamente
if (require.main === module) {
    const validator = new PWAValidator();
    
    validator.runAllTests().then(success => {
        validator.saveResults();
        
        if (success) {
            console.log('\n🎉 Validação PWA concluída com sucesso!');
            process.exit(0);
        } else {
            console.log('\n⚠️ Validação PWA concluída com problemas. Verifique as recomendações acima.');
            process.exit(1);
        }
    }).catch(error => {
        console.error('\n❌ Erro durante validação:', error);
        process.exit(1);
    });
}

module.exports = PWAValidator;