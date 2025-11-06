# Guia de Testes PWA - EV Advocacia Criminal

## Visão Geral

Este documento fornece um guia completo para testar as funcionalidades PWA (Progressive Web App) da aplicação EV Advocacia Criminal. Os testes cobrem validação, instalação, performance, cache e funcionalidades offline.

## Estrutura de Testes

### 1. Scripts de Teste Disponíveis

```bash
# Teste completo de PWA
npm run test:pwa

# Validação estática apenas
npm run test:pwa-validation

# Testes de instalação
npm run test:pwa-installation

# Testes específicos de cache
npm run test:pwa-cache

# Validação rápida
npm run validate:pwa

# Teste completo com build
npm run test:pwa-full
```

### 2. Ferramentas de Teste

- **Puppeteer**: Automação de navegador para testes de instalação
- **Chrome DevTools**: Validação manual de PWA
- **Lighthouse**: Auditoria de performance e PWA
- **Scripts customizados**: Validação específica da aplicação

## Categorias de Teste

### 1. Validação Estática (`test-pwa-validation.js`)

#### O que testa:
- ✅ Presença e validade do manifest.json
- ✅ Configuração do service worker
- ✅ Ícones PWA em múltiplas resoluções
- ✅ Meta tags necessárias
- ✅ Configuração HTTPS
- ✅ Estrutura de arquivos PWA

#### Como executar:
```bash
npm run test:pwa-validation
```

#### Critérios de aprovação:
- Manifest válido com todos os campos obrigatórios
- Service worker configurado corretamente
- Ícones em pelo menos 3 resoluções diferentes
- Meta tags para iOS e Android presentes
- Score mínimo: 80/100

### 2. Testes de Instalação (`test-pwa-installation.js`)

#### O que testa:
- 📱 Prompt de instalação (beforeinstallprompt)
- 🔧 Registro do service worker
- 📡 Funcionalidade offline
- 💾 Eficiência do cache
- 🔄 Mecanismo de atualização
- 📱 Compatibilidade entre dispositivos

#### Pré-requisitos:
```bash
# Iniciar aplicação em modo de produção
npm run serve:sw
```

#### Como executar:
```bash
npm run test:pwa-installation
```

#### Critérios de aprovação:
- Service worker registrado e ativo
- Aplicação funcional offline
- Cache hit ratio > 60%
- Compatível com dispositivos móveis

### 3. Testes de Cache (`test-pwa-cache.js`)

#### O que testa:
- 🗄️ População inicial do cache
- ⚡ Eficiência do cache
- 📡 Cache offline
- 🎯 Estratégias de cache
- 🔄 Invalidação de cache
- ⚡ Priorização de recursos

#### Como executar:
```bash
npm run test:pwa-cache
```

#### Métricas importantes:
- **Cache Hit Ratio**: > 70% para score bom
- **Load Time**: < 3s para primeira visita, < 1s para visitas subsequentes
- **Recursos em Cache**: Mínimo 10 recursos críticos
- **Eficiência Offline**: Funcionalidade completa sem rede

### 4. Teste Completo (`run-pwa-tests.js`)

#### O que inclui:
1. **Fase 1**: Validação estática
2. **Fase 2**: Testes de instalação (se validação passou)
3. **Fase 3**: Análise de performance
4. **Relatório Final**: Score consolidado e recomendações

#### Como executar:
```bash
npm run test:pwa-full
```

## Interpretação de Resultados

### Códigos de Status

- ✅ **PASS**: Teste passou com sucesso
- ❌ **FAIL**: Teste falhou - requer correção
- ⚠️ **WARNING**: Teste passou mas com ressalvas
- ℹ️ **INFO**: Informação adicional

### Scores de Qualidade

#### Score Geral (0-100)
- **90-100**: Excelente - Pronto para produção
- **80-89**: Bom - Pequenos ajustes recomendados
- **70-79**: Regular - Melhorias necessárias
- **< 70**: Ruim - Correções obrigatórias

#### Métricas Específicas

**Load Time:**
- < 1s: Excelente
- 1-3s: Bom
- 3-5s: Regular
- > 5s: Ruim

**Cache Hit Ratio:**
- > 80%: Excelente
- 60-80%: Bom
- 40-60%: Regular
- < 40%: Ruim

## Testes Manuais Complementares

### 1. Chrome DevTools

#### Audit PWA:
1. Abrir DevTools (F12)
2. Ir para aba "Lighthouse"
3. Selecionar "Progressive Web App"
4. Executar auditoria

#### Verificar Service Worker:
1. DevTools > Application > Service Workers
2. Verificar status "activated and running"
3. Testar "Update on reload"

#### Testar Cache:
1. DevTools > Application > Storage
2. Verificar Cache Storage
3. Inspecionar recursos cacheados

### 2. Teste de Instalação Manual

#### Desktop (Chrome):
1. Acessar aplicação
2. Procurar ícone de instalação na barra de endereço
3. Clicar em "Instalar"
4. Verificar se abre como aplicação standalone

#### Mobile (Android):
1. Acessar via Chrome mobile
2. Menu > "Adicionar à tela inicial"
3. Verificar ícone na tela inicial
4. Abrir e verificar modo standalone

### 3. Teste Offline

#### Procedimento:
1. Carregar aplicação normalmente
2. DevTools > Network > "Offline"
3. Recarregar página
4. Verificar funcionalidade

#### O que deve funcionar offline:
- ✅ Navegação entre páginas principais
- ✅ Visualização de dados cacheados
- ✅ Interface completa
- ✅ Mensagem de status offline

## Resolução de Problemas Comuns

### Service Worker não registra

**Possíveis causas:**
- Aplicação não está em HTTPS
- Arquivo ngsw-worker.js não encontrado
- Erro na configuração do Angular

**Soluções:**
```bash
# Verificar build de produção
npm run build:prod

# Servir com HTTPS local
npm run serve:sw

# Verificar configuração
cat angular.json | grep serviceWorker
```

### Manifest inválido

**Verificar:**
- Sintaxe JSON válida
- Campos obrigatórios presentes
- URLs corretas
- Ícones acessíveis

**Comando de validação:**
```bash
npm run validate:pwa
```

### Cache não funciona

**Verificar:**
- Service worker ativo
- Configuração ngsw-config.json
- Recursos incluídos nas estratégias de cache

**Debug:**
```javascript
// No console do navegador
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Registration:', reg);
});

// Verificar caches
caches.keys().then(names => {
  console.log('Cache names:', names);
});
```

### Performance ruim

**Otimizações:**
- Revisar estratégias de cache
- Otimizar tamanho de bundle
- Implementar lazy loading
- Comprimir assets

## Automação de Testes

### CI/CD Integration

```yaml
# Exemplo para GitHub Actions
- name: Test PWA
  run: |
    npm ci
    npm run build:prod
    npm run test:pwa-validation
    
- name: PWA Performance Test
  run: npm run test:pwa-cache
```

### Testes Regulares

**Recomendação:**
- Executar `npm run validate:pwa` a cada commit
- Executar `npm run test:pwa-full` antes de releases
- Monitorar métricas de cache em produção

## Relatórios Gerados

### Arquivos de Relatório

- `pwa-validation-report.json`: Resultados da validação estática
- `pwa-installation-report.json`: Resultados dos testes de instalação
- `pwa-cache-report.json`: Métricas detalhadas de cache
- `pwa-test-report-final.json`: Relatório consolidado

### Estrutura do Relatório

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "overallScore": 85,
  "isReady": true,
  "phases": {
    "validation": { "success": true, "score": 90 },
    "installation": { "success": true },
    "performance": { "success": true }
  },
  "recommendations": [
    "Otimizar tamanho do bundle",
    "Melhorar cache hit ratio"
  ]
}
```

## Monitoramento Contínuo

### Métricas em Produção

**Implementar tracking para:**
- Install prompt acceptance rate
- Service worker update frequency
- Cache hit ratios
- Offline usage patterns
- Performance metrics

### Alertas Recomendados

- Cache hit ratio < 60%
- Load time > 3s
- Service worker registration failures
- Manifest validation errors

## Checklist de Lançamento

### Antes do Deploy

- [ ] Todos os testes PWA passando
- [ ] Score geral > 80
- [ ] Testado em dispositivos reais
- [ ] Cache strategies validadas
- [ ] Funcionalidade offline confirmada
- [ ] Ícones e manifest validados

### Pós Deploy

- [ ] Verificar instalação em produção
- [ ] Monitorar métricas de cache
- [ ] Confirmar atualizações automáticas
- [ ] Validar performance real

## Recursos Adicionais

### Documentação Oficial
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Angular Service Worker](https://angular.io/guide/service-worker-intro)
- [Web App Manifest](https://web.dev/add-manifest/)

### Ferramentas de Debug
- Chrome DevTools
- PWA Builder
- Lighthouse CI
- WebPageTest

---

**Última atualização:** Janeiro 2024  
**Versão:** 1.0  
**Responsável:** Equipe de Desenvolvimento EV Advocacia Criminal