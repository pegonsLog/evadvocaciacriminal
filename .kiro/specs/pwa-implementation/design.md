# Documento de Design - Implementação PWA

## Visão Geral

Este documento detalha o design técnico para transformar o sistema EV Advocacia Criminal em uma Progressive Web App (PWA). A implementação utilizará o Angular Service Worker, Web App Manifest e estratégias de cache otimizadas para oferecer uma experiência nativa aos usuários.

## Arquitetura

### Componentes Principais

```
PWA Implementation
├── Web App Manifest (manifest.json)
├── Service Worker (ngsw-worker.js)
├── Ícones PWA (múltiplas resoluções)
├── Offline Fallback Page
├── Update Service (Angular)
└── Cache Strategies
```

### Fluxo de Funcionamento

1. **Primeira Visita**: Usuário acessa a aplicação, service worker é registrado, recursos são cacheados
2. **Visitas Subsequentes**: Recursos são servidos do cache, melhorando performance
3. **Detecção de Atualizações**: Service worker verifica por novas versões automaticamente
4. **Modo Offline**: Fallback pages são servidas quando não há conectividade
5. **Instalação**: Manifest permite instalação como app nativo

## Componentes e Interfaces

### 1. Web App Manifest

**Localização**: `src/manifest.json`

**Propriedades Principais**:

- `name`: "EV Advocacia Criminal"
- `short_name`: "EV Advocacia"
- `description`: "Sistema de gestão para escritório de advocacia criminal"
- `start_url`: "/"
- `display`: "standalone"
- `theme_color`: "#007bff" (baseado no tema Bootstrap)
- `background_color`: "#ffffff"
- `orientation`: "portrait-primary"
- `icons`: Array com ícones de 72x72 até 512x512

### 2. Service Worker Configuration

**Localização**: `ngsw-config.json`

**Estratégias de Cache**:

```json
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "firebase-api",
      "urls": ["https://firestore.googleapis.com/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "1h"
      }
    }
  ]
}
```

### 3. Update Service

**Localização**: `src/app/services/pwa-update.service.ts`

**Responsabilidades**:

- Detectar atualizações disponíveis
- Notificar usuário sobre novas versões
- Gerenciar processo de atualização
- Recarregar aplicação após atualização

**Interface**:

```typescript
interface PWAUpdateService {
  checkForUpdate(): Promise<boolean>;
  promptUserToUpdate(): void;
  activateUpdate(): Promise<boolean>;
  isUpdateAvailable$: Observable<boolean>;
}
```

### 4. Offline Component

**Localização**: `src/app/components/offline/offline.component.ts`

**Funcionalidades**:

- Detectar status de conectividade
- Exibir página de fallback offline
- Mostrar dados cacheados quando disponível
- Indicador visual de status de conexão

### 5. Ícones PWA

**Localização**: `src/assets/icons/`

**Tamanhos Necessários**:

- 72x72 (Android)
- 96x96 (Android)
- 128x128 (Android)
- 144x144 (Android)
- 152x152 (iOS)
- 192x192 (Android)
- 384x384 (Android)
- 512x512 (Android, Splash Screen)

## Modelos de Dados

### PWA Configuration Model

```typescript
interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  themeColor: string;
  backgroundColor: string;
  orientation: "portrait" | "landscape" | "any";
  icons: PWAIcon[];
}

interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: "any" | "maskable" | "monochrome";
}
```

### Update Status Model

```typescript
interface UpdateStatus {
  isAvailable: boolean;
  isDownloading: boolean;
  isInstalling: boolean;
  currentVersion: string;
  availableVersion: string;
}
```

## Tratamento de Erros

### Cenários de Erro

1. **Service Worker Registration Failed**

   - Log do erro
   - Aplicação continua funcionando normalmente
   - Notificação discreta ao usuário

2. **Cache Storage Failed**

   - Fallback para funcionamento sem cache
   - Log do erro para debugging
   - Não impacta funcionalidade principal

3. **Update Process Failed**

   - Retry automático após intervalo
   - Notificação ao usuário se persistir
   - Manter versão atual funcionando

4. **Offline Mode Errors**
   - Exibir mensagens informativas
   - Mostrar dados disponíveis em cache
   - Indicar quando funcionalidades não estão disponíveis

### Error Handling Strategy

```typescript
class PWAErrorHandler {
  handleServiceWorkerError(error: Error): void;
  handleCacheError(error: Error): void;
  handleUpdateError(error: Error): void;
  handleOfflineError(error: Error): void;
}
```

## Estratégia de Testes

### Testes Unitários

- **PWA Update Service**: Testar detecção e aplicação de atualizações
- **Offline Component**: Testar detecção de conectividade
- **Error Handlers**: Testar cenários de falha

### Testes de Integração

- **Service Worker Registration**: Verificar registro correto
- **Cache Strategies**: Testar armazenamento e recuperação
- **Manifest Validation**: Verificar propriedades do manifest

### Testes E2E

- **Installation Flow**: Testar processo de instalação
- **Offline Functionality**: Testar comportamento offline
- **Update Process**: Testar fluxo completo de atualização

### Testes de Performance

- **Cache Hit Ratio**: Medir eficiência do cache
- **Load Times**: Comparar tempos com/sem PWA
- **Bundle Size Impact**: Verificar impacto no tamanho da aplicação

## Considerações de Implementação

### Compatibilidade

- **Navegadores Suportados**: Chrome 67+, Firefox 67+, Safari 11.1+, Edge 79+
- **Dispositivos**: Android 5.0+, iOS 11.3+, Windows 10+
- **Fallback Graceful**: Funcionalidade completa mesmo sem suporte PWA

### Performance

- **Cache Strategy**: Otimizada para recursos estáticos e dados dinâmicos
- **Bundle Size**: Impacto mínimo no tamanho da aplicação
- **Network Usage**: Redução significativa após primeira visita

### Segurança

- **HTTPS Required**: PWA funciona apenas em conexões seguras
- **Service Worker Scope**: Limitado ao domínio da aplicação
- **Cache Security**: Dados sensíveis não são cacheados

### Manutenção

- **Update Strategy**: Atualizações automáticas com notificação ao usuário
- **Cache Management**: Limpeza automática de cache antigo
- **Monitoring**: Logs para acompanhar performance e erros
