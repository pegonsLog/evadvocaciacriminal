# 🚀 PWA Testing Suite - EV Advocacia Criminal

## Quick Start

```bash
# Instalar dependências de teste
npm install

# Executar validação rápida
npm run validate:pwa

# Executar suite completa de testes
npm run test:pwa-full
```

## 📋 Scripts Disponíveis

| Script | Descrição | Tempo Estimado |
|--------|-----------|----------------|
| `npm run validate:pwa` | Validação estática básica | ~30s |
| `npm run test:pwa-validation` | Validação completa de arquivos | ~1min |
| `npm run test:pwa-installation` | Testes de instalação e funcionalidade | ~3min |
| `npm run test:pwa-cache` | Análise detalhada de cache | ~2min |
| `npm run test:pwa` | Suite completa (sem build) | ~5min |
| `npm run test:pwa-full` | Suite completa com build | ~8min |

## 🎯 O que é Testado

### ✅ Validação Estática
- Manifest.json válido e completo
- Service Worker configurado
- Ícones PWA em múltiplas resoluções
- Meta tags para iOS/Android
- Configuração HTTPS

### 📱 Instalação e Funcionalidade
- Prompt de instalação (beforeinstallprompt)
- Registro do Service Worker
- Funcionalidade offline completa
- Compatibilidade cross-device
- Mecanismo de atualizações

### 💾 Performance e Cache
- Eficiência do cache (hit ratio)
- Tempos de carregamento
- Estratégias de cache
- Priorização de recursos
- Invalidação de cache

## 📊 Interpretação de Resultados

### Scores de Qualidade

```
🎉 90-100: Excelente - Pronto para produção
✅ 80-89:  Bom - Pequenos ajustes recomendados  
⚠️ 70-79:  Regular - Melhorias necessárias
❌ < 70:   Ruim - Correções obrigatórias
```

### Métricas Importantes

| Métrica | Excelente | Bom | Regular | Ruim |
|---------|-----------|-----|---------|------|
| Load Time | < 1s | 1-3s | 3-5s | > 5s |
| Cache Hit Ratio | > 80% | 60-80% | 40-60% | < 40% |
| Offline Score | 100% | 80-99% | 60-79% | < 60% |

## 🔧 Setup para Testes

### Pré-requisitos

```bash
# Node.js 18+ e npm
node --version
npm --version

# Dependências específicas
npm install puppeteer --save-dev
```

### Configuração Local

```bash
# 1. Build de produção
npm run build:prod

# 2. Servir com service worker
npm run serve:sw

# 3. Em outro terminal, executar testes
npm run test:pwa-installation
```

## 🐛 Troubleshooting

### Service Worker não registra

```bash
# Verificar configuração
cat angular.json | grep serviceWorker

# Verificar build
ls dist/evadvociacriminal/ngsw*

# Testar manualmente
curl -I http://localhost:4200/ngsw-worker.js
```

### Manifest inválido

```bash
# Validar JSON
cat src/manifest.json | jq .

# Verificar no navegador
curl http://localhost:4200/manifest.json
```

### Testes falhando

```bash
# Verificar aplicação rodando
curl -I http://localhost:4200

# Logs detalhados
DEBUG=puppeteer:* npm run test:pwa-installation

# Executar em modo não-headless
# Editar test-pwa-installation.js: headless: false
```

## 📁 Arquivos de Teste

```
├── test-pwa-validation.js      # Validação estática
├── test-pwa-installation.js    # Testes de instalação  
├── test-pwa-cache.js          # Análise de cache
├── run-pwa-tests.js           # Orquestrador principal
└── docs/
    └── PWA_TESTING_GUIDE.md   # Documentação completa
```

## 📈 Relatórios Gerados

Após execução, os seguintes relatórios são gerados:

- `pwa-validation-report.json` - Validação estática
- `pwa-installation-report.json` - Testes de instalação
- `pwa-cache-report.json` - Métricas de cache
- `pwa-test-report-final.json` - Relatório consolidado

### Exemplo de Relatório

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "overallScore": 85,
  "isReady": true,
  "summary": {
    "validationPassed": true,
    "installationPassed": true, 
    "performancePassed": true
  },
  "recommendations": [
    "Otimizar tamanho do bundle (atual: 2.1MB)",
    "Melhorar cache hit ratio para > 80%"
  ]
}
```

## 🚀 Integração CI/CD

### GitHub Actions

```yaml
name: PWA Tests
on: [push, pull_request]

jobs:
  pwa-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        
      - name: PWA Validation
        run: npm run validate:pwa
        
      - name: Build and Test PWA
        run: npm run test:pwa-full
        
      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: pwa-reports
          path: '*-report.json'
```

## 🎯 Checklist de Qualidade

### Antes do Deploy

- [ ] `npm run validate:pwa` - Score > 80
- [ ] `npm run test:pwa-cache` - Cache hit > 60%
- [ ] Testado em Chrome, Firefox, Safari
- [ ] Testado em dispositivo Android real
- [ ] Testado em dispositivo iOS real
- [ ] Funcionalidade offline confirmada

### Pós Deploy

- [ ] Instalação funcionando em produção
- [ ] Service Worker ativo
- [ ] Atualizações automáticas funcionando
- [ ] Métricas de performance monitoradas

## 📚 Recursos Adicionais

- [Documentação Completa](./docs/PWA_TESTING_GUIDE.md)
- [PWA Checklist Oficial](https://web.dev/pwa-checklist/)
- [Angular Service Worker Guide](https://angular.io/guide/service-worker-intro)

## 🤝 Contribuindo

Para adicionar novos testes ou melhorar os existentes:

1. Edite os arquivos `test-pwa-*.js`
2. Execute `npm run test:pwa-validation` para validar
3. Atualize documentação se necessário
4. Submeta PR com descrição das mudanças

---

**Dúvidas?** Consulte a [documentação completa](./docs/PWA_TESTING_GUIDE.md) ou abra uma issue.

**Status dos Testes:** [![PWA Tests](https://github.com/seu-repo/evadvociacriminal/workflows/PWA%20Tests/badge.svg)](https://github.com/seu-repo/evadvociacriminal/actions)