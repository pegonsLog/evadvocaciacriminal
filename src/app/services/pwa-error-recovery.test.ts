/**
 * Teste simples para verificar funcionalidades do sistema de recuperação PWA
 * Este arquivo pode ser usado para debugging e validação manual
 */

import { PWAErrorRecoveryService } from './pwa-error-recovery.service';
import { PWARetryService } from './pwa-retry.service';

/**
 * Função utilitária para testar o sistema de retry
 */
export async function testPWARetrySystem(): Promise<void> {
    console.log('🧪 [PWA-TEST] Iniciando teste do sistema de retry...');

    const retryService = new PWARetryService();

    // Teste 1: Operação que falha e depois funciona
    let attemptCount = 0;
    const flakyOperation = async (): Promise<string> => {
        attemptCount++;
        console.log(`🔄 [PWA-TEST] Tentativa ${attemptCount}`);
        
        if (attemptCount < 3) {
            throw new Error(`Falha simulada na tentativa ${attemptCount}`);
        }
        
        return 'Sucesso!';
    };

    try {
        const result = await retryService.retryAsync(flakyOperation, {
            maxRetries: 5,
            baseDelay: 100,
            maxDelay: 1000
        });
        
        console.log('✅ [PWA-TEST] Teste de retry bem-sucedido:', result);
    } catch (error) {
        console.error('❌ [PWA-TEST] Teste de retry falhou:', error);
    }

    // Teste 2: Operação de rede simulada
    const networkOperation = async (): Promise<boolean> => {
        // Simula falha de rede
        if (Math.random() < 0.7) {
            throw new Error('Network error: fetch failed');
        }
        return true;
    };

    try {
        const networkResult = await retryService.retryNetworkOperation(networkOperation, {
            maxRetries: 3,
            baseDelay: 200
        });
        
        console.log('✅ [PWA-TEST] Teste de rede bem-sucedido:', networkResult);
    } catch (error) {
        console.log('ℹ️ [PWA-TEST] Teste de rede falhou (esperado):', error.message);
    }

    console.log('🧪 [PWA-TEST] Testes concluídos');
}

/**
 * Função para testar detecção de erros recuperáveis
 */
export function testErrorRecoveryDetection(): void {
    console.log('🧪 [PWA-TEST] Testando detecção de erros recuperáveis...');

    const retryService = new PWARetryService();

    // Erros recuperáveis
    const recoverableErrors = [
        new Error('Network error'),
        new Error('fetch failed'),
        { name: 'QuotaExceededError', message: 'Storage quota exceeded' },
        new Error('Cache operation failed')
    ];

    // Erros não recuperáveis
    const nonRecoverableErrors = [
        { code: 'permission-denied', message: 'Permission denied' },
        { code: 'unauthenticated', message: 'User not authenticated' },
        { code: 'invalid-argument', message: 'Invalid argument provided' }
    ];

    recoverableErrors.forEach((error, index) => {
        const isRecoverable = retryService.isRecoverableError(error);
        console.log(`✅ [PWA-TEST] Erro recuperável ${index + 1}:`, isRecoverable, error);
    });

    nonRecoverableErrors.forEach((error, index) => {
        const isRecoverable = retryService.isRecoverableError(error);
        console.log(`❌ [PWA-TEST] Erro não recuperável ${index + 1}:`, isRecoverable, error);
    });

    console.log('🧪 [PWA-TEST] Teste de detecção concluído');
}

/**
 * Função para simular cenários de erro PWA
 */
export function simulatePWAErrors(): void {
    console.log('🧪 [PWA-TEST] Simulando erros PWA para teste...');

    // Simula erro de service worker
    const swError = new Error('Service worker registration failed');
    console.log('🔧 [PWA-TEST] Erro de SW simulado:', swError);

    // Simula erro de cache
    const cacheError = { name: 'QuotaExceededError', message: 'Cache storage quota exceeded' };
    console.log('💾 [PWA-TEST] Erro de cache simulado:', cacheError);

    // Simula erro de rede
    const networkError = new Error('Failed to fetch');
    console.log('🌐 [PWA-TEST] Erro de rede simulado:', networkError);

    console.log('🧪 [PWA-TEST] Simulação de erros concluída');
}

// Exporta função para executar todos os testes
export async function runAllPWATests(): Promise<void> {
    console.log('🚀 [PWA-TEST] Iniciando todos os testes PWA...');
    
    testErrorRecoveryDetection();
    simulatePWAErrors();
    await testPWARetrySystem();
    
    console.log('🎉 [PWA-TEST] Todos os testes PWA concluídos!');
}

// Para uso no console do navegador
if (typeof window !== 'undefined') {
    (window as any).testPWA = {
        runAllTests: runAllPWATests,
        testRetry: testPWARetrySystem,
        testDetection: testErrorRecoveryDetection,
        simulateErrors: simulatePWAErrors
    };
    
    console.log('🧪 [PWA-TEST] Funções de teste disponíveis em window.testPWA');
}