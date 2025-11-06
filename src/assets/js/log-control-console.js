/**
 * Script para controle de logs via console do navegador
 * Adiciona funções globais para facilitar o debug
 */

(function() {
    'use strict';

    // Aguarda o Angular carregar
    function waitForAngular() {
        if (typeof window.ng === 'undefined') {
            setTimeout(waitForAngular, 100);
            return;
        }
        
        setupLogControls();
    }

    function setupLogControls() {
        // Função para obter o LoggerService
        function getLoggerService() {
            try {
                const appRef = window.ng.getComponent(document.querySelector('app-root'));
                return appRef?.injector?.get('LoggerService');
            } catch (error) {
                console.warn('Não foi possível acessar o LoggerService:', error);
                return null;
            }
        }

        // Função para obter o LogControlComponent
        function getLogControlComponent() {
            try {
                const logControl = document.querySelector('app-log-control');
                if (logControl) {
                    return window.ng.getComponent(logControl);
                }
            } catch (error) {
                console.warn('Não foi possível acessar o LogControlComponent:', error);
            }
            return null;
        }

        // Adicionar funções globais para controle de logs
        window.logControl = {
            // Mostrar/ocultar painel de controle
            toggle: function() {
                const component = getLogControlComponent();
                if (component) {
                    component.toggleControls();
                    console.log('Painel de controle de logs alternado');
                } else {
                    console.log('Componente de controle não encontrado');
                }
            },

            // Definir nível de log
            setLevel: function(level) {
                const logger = getLoggerService();
                if (logger) {
                    const levels = { error: 0, warn: 1, info: 2, debug: 3, verbose: 4 };
                    const numLevel = typeof level === 'string' ? levels[level.toLowerCase()] : level;
                    
                    if (numLevel !== undefined) {
                        logger.setLogLevel(numLevel);
                        console.log(`Nível de log definido para: ${level} (${numLevel})`);
                    } else {
                        console.log('Níveis válidos: error(0), warn(1), info(2), debug(3), verbose(4)');
                    }
                } else {
                    console.log('LoggerService não encontrado');
                }
            },

            // Habilitar categoria
            enable: function(category) {
                const logger = getLoggerService();
                if (logger) {
                    logger.enableCategory(category);
                    console.log(`Categoria '${category}' habilitada`);
                } else {
                    console.log('LoggerService não encontrado');
                }
            },

            // Desabilitar categoria
            disable: function(category) {
                const logger = getLoggerService();
                if (logger) {
                    logger.disableCategory(category);
                    console.log(`Categoria '${category}' desabilitada`);
                } else {
                    console.log('LoggerService não encontrado');
                }
            },

            // Aplicar preset
            preset: function(preset) {
                const component = getLogControlComponent();
                if (component) {
                    component.applyPreset(preset);
                    console.log(`Preset '${preset}' aplicado`);
                } else {
                    console.log('Presets disponíveis: production, development, debug');
                }
            },

            // Limpar logs
            clear: function() {
                const logger = getLoggerService();
                if (logger) {
                    logger.clearLogs();
                    console.log('Logs limpos');
                } else {
                    console.log('LoggerService não encontrado');
                }
            },

            // Exportar logs
            export: function() {
                const logger = getLoggerService();
                if (logger) {
                    const logs = logger.exportLogs();
                    console.log('Logs exportados:');
                    console.log(logs);
                    
                    // Criar download automático
                    const blob = new Blob([logs], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `app-logs-${new Date().toISOString().slice(0, 19)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    console.log('Arquivo de logs baixado');
                } else {
                    console.log('LoggerService não encontrado');
                }
            },

            // Mostrar configuração atual
            config: function() {
                const logger = getLoggerService();
                if (logger) {
                    const config = logger.getConfig();
                    console.log('Configuração atual de logs:');
                    console.table(config);
                } else {
                    console.log('LoggerService não encontrado');
                }
            },

            // Mostrar estatísticas
            stats: function() {
                const logger = getLoggerService();
                if (logger) {
                    const logs = logger.getLogs();
                    const stats = {
                        total: logs.length,
                        byLevel: {},
                        byCategory: {},
                        recent: logs.slice(-5).map(log => ({
                            time: log.timestamp,
                            level: log.level,
                            category: log.category,
                            message: log.message
                        }))
                    };

                    logs.forEach(log => {
                        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
                        stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
                    });

                    console.log('Estatísticas de logs:');
                    console.table(stats);
                } else {
                    console.log('LoggerService não encontrado');
                }
            },

            // Ajuda
            help: function() {
                console.log(`
🔧 CONTROLE DE LOGS - COMANDOS DISPONÍVEIS:

📋 Básicos:
  logControl.toggle()           - Mostrar/ocultar painel de controle
  logControl.setLevel(level)    - Definir nível (error, warn, info, debug, verbose)
  logControl.preset(name)       - Aplicar preset (production, development, debug)

🎯 Categorias:
  logControl.enable(category)   - Habilitar categoria específica
  logControl.disable(category)  - Desabilitar categoria específica

📊 Informações:
  logControl.config()           - Mostrar configuração atual
  logControl.stats()            - Mostrar estatísticas de logs
  
🧹 Manutenção:
  logControl.clear()            - Limpar todos os logs
  logControl.export()           - Exportar logs para arquivo

📝 Exemplos:
  logControl.setLevel('debug')
  logControl.enable('HOME')
  logControl.preset('development')
  logControl.disable('PWA-PERFORMANCE')

🏷️ Categorias disponíveis:
  HOME, SERVICE, PARCELA-SERVICE, PWA-ERROR, PWA-RECOVERY,
  PWA-CACHE, PWA-PERFORMANCE, PWA-HEALTH, AUTH, CRITICAL
                `);
            }
        };

        // Mostrar mensagem de boas-vindas
        console.log(`
🎛️ CONTROLE DE LOGS ATIVADO!

Digite 'logControl.help()' para ver todos os comandos disponíveis.
Digite 'logControl.toggle()' para mostrar/ocultar o painel visual.

Ambiente: ${window.location.hostname === 'localhost' ? 'Desenvolvimento' : 'Produção'}
        `);
    }

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForAngular);
    } else {
        waitForAngular();
    }
})();