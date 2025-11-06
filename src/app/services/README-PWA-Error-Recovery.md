# Sistema de Recuperação de Erros PWA

Este documento descreve o sistema de recuperação de erros implementado para a aplicação PWA.

## Visão Geral

O sistema de recuperação de erros PWA é composto por vários serviços que trabalham em conjunto para:

1. **Detectar erros** relacionados ao PWA
2. **Tentar recuperação automática** com retry inteligente
3. **Notificar o usuário** de forma discreta quando necessário
4. **Manter a funcionalidade principal** mesmo com falhas PWA

## Componentes Principais

### 1. PWAErrorHandlerService
- **Função**: Captura e categoriza erros PWA
- **Tipos de erro**: Service Worker, Cache, Update, Network, Offline
- **Severidade**: Info, Warning, Error, Critical
- **Recursos**: Logging, estatísticas, resolução de erros

### 2. PWAErrorRecoveryService
- **Função**: Executa recuperação automática e manual
- **Estratégias**: Retry com backoff exponencial
- **Operações**: Reregistro de SW, limpeza de cache, verificação de rede
- **Notificações**: Discretas e baseadas no contexto

### 3. PWARetryService
- **Função**: Utilitário para retry com diferentes estratégias
- **Configurações**: Delay, max retries, backoff, jitter
- **Tipos**: Network, Cache, Service Worker, Geral
- **Condições**: Verifica se erro é recuperável

### 4. PWAGlobalErrorService
- **Função**: Intercepta erros globais da aplicação
- **Detecção**: Identifica erros relacionados ao PWA
- **Roteamento**: Direciona para handlers específicos

### 5. PWAHealthCheckService
- **Função**: Monitora saúde geral do PWA
- **Verificações**: SW status, cache, updates, offline
- **Recomendações**: Sugere ações baseadas no status

## Como Funciona

### Fluxo de Recuperação Automática

1. **Erro Detectado**: Um erro PWA é capturado
2. **Categorização**: O erro é classificado por tipo e severidade
3. **Agenda Retry**: Se recuperável, agenda tentativa automática
4. **Execução**: Tenta recuperação específica para o tipo de erro
5. **Resultado**: Marca como resolvido ou agenda nova tentativa
6. **Notificação**: Se falha persistir, notifica usuário discretamente

### Tipos de Recuperação

#### Service Worker
- Desregistra service worker atual
- Re-registra com configuração limpa
- Força atualização do registro

#### Cache
- Limpa caches corrompidos
- Força recriação do cache
- Envia mensagem para SW recriar cache

#### Update
- Força verificação de atualização
- Reinicia processo de update
- Aguarda conclusão do processo

#### Network
- Testa conectividade básica
- Retry com delay progressivo
- Fallback para cache quando possível

#### Offline
- Verifica se voltou online
- Força sincronização pendente
- Valida cache disponível

## Configuração

### Retry Padrão
```typescript
{
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true
}
```

### Configurações por Tipo
- **Network**: 5 retries, delay 2s, max 15s
- **Cache**: 2 retries, delay 500ms, max 5s
- **Service Worker**: 3 retries, delay 1s, max 10s

## Uso

### Recuperação Manual
```typescript
// No componente
async forcePWARecovery() {
    await this.pwaErrorRecovery.forceRecovery('service-worker');
    await this.pwaErrorRecovery.forceRecovery('cache');
}
```

### Monitoramento
```typescript
// Subscrever para estatísticas
this.pwaErrorHandler.errorStats$.subscribe(stats => {
    console.log('Erros ativos:', stats.activeErrors);
});

// Verificar operações de recuperação
this.pwaErrorRecovery.operations$.subscribe(operations => {
    console.log('Operações ativas:', operations);
});
```

### Teste Manual
```typescript
// No console do navegador
window.testPWA.runAllTests();
window.testPWA.testRetry();
window.testPWA.simulateErrors();
```

## Notificações Discretas

O sistema evita spam de notificações através de:

- **Cooldown**: 30 segundos entre notificações do mesmo tipo
- **Contexto**: Mensagens específicas para cada tipo de erro
- **Severidade**: Apenas erros importantes geram notificações visuais
- **Console**: Logs detalhados para debugging

### Exemplos de Notificações

- **Service Worker**: "Algumas funcionalidades offline podem estar limitadas"
- **Cache**: "O carregamento pode estar mais lento que o normal"
- **Update**: "Não foi possível verificar atualizações automaticamente"
- **Network**: "Problemas de conectividade detectados"

## Monitoramento e Estatísticas

### Métricas Disponíveis
- Total de operações de recuperação
- Taxa de sucesso/falha
- Tempo médio de recuperação
- Operações por tipo
- Erros ativos por severidade

### Health Check
- Status do Service Worker
- Disponibilidade do cache
- Status de atualizações
- Suporte offline
- Recomendações de ação

## Debugging

### Logs no Console
Todos os serviços geram logs prefixados:
- `🔄 [PWA-RECOVERY]`: Operações de recuperação
- `🔄 [PWA-RETRY]`: Tentativas de retry
- `❌ [PWA-ERROR]`: Erros capturados
- `🏥 [PWA-HEALTH]`: Verificações de saúde
- `🌐 [PWA-GLOBAL]`: Error handler global

### Componente de Status (Opcional)
```html
<!-- Para debugging, descomente no app.component.html -->
<app-pwa-error-status></app-pwa-error-status>
```

### Métodos de Debug
```typescript
// Verificar erros ativos
this.pwaErrorHandler.getActiveErrors();

// Estatísticas de recuperação
this.pwaErrorRecovery.getCurrentStats();

// Operações ativas
this.pwaErrorRecovery.getActiveOperations();

// Status de saúde
this.pwaHealthCheck.getOverallHealth();
```

## Manutenção

### Limpeza Automática
- Erros resolvidos são limpos a cada hora
- Operações antigas (>24h) são removidas automaticamente
- Logs de health check mantidos por 1 hora

### Configuração de Produção
- Error handler global está ativo
- Recuperação automática habilitada
- Notificações discretas ativas
- Logs detalhados no console

## Considerações de Performance

- **Retry Inteligente**: Backoff exponencial evita spam
- **Jitter**: Randomização previne thundering herd
- **Cooldown**: Previne notificações excessivas
- **Limpeza**: Remove dados antigos automaticamente
- **Lazy Loading**: Serviços carregados sob demanda

## Extensibilidade

O sistema foi projetado para ser extensível:

1. **Novos Tipos de Erro**: Adicionar em `PWAError['type']`
2. **Estratégias de Recuperação**: Implementar em `PWAErrorRecoveryService`
3. **Condições de Retry**: Customizar em `PWARetryService`
4. **Notificações**: Personalizar em `showDiscreteNotification`
5. **Health Checks**: Adicionar verificações em `PWAHealthCheckService`