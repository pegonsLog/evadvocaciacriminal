# 🚀 Guia Rápido - Testes PWA

## ⚡ Execução Rápida (5 minutos)

```bash
# 1. Validação básica
npm run validate:pwa

# 2. Se passou, executar suite completa
./run-all-pwa-tests.sh
```

## 📋 Checklist Pré-Deploy

### ✅ Obrigatório
- [ ] `npm run validate:pwa` - Score > 80
- [ ] Build de produção sem erros
- [ ] Service Worker registrado
- [ ] Manifest válido
- [ ] Funciona offline

### 🎯 Recomendado  
- [ ] `npm run test:pwa-cache` - Cache hit > 60%
- [ ] Testado em dispositivo real
- [ ] Load time < 3s
- [ ] Instalação funcionando

## 🐛 Problemas Comuns

### Service Worker não registra
```bash
# Verificar configuração
cat angular.json | grep serviceWorker
# Deve retornar: "serviceWorker": true

# Verificar build
npm run build:prod
ls dist/evadvociacriminal/ngsw*
# Deve listar: ngsw-worker.js, ngsw.json
```

### Manifest inválido
```bash
# Validar sintaxe
cat src/manifest.json | jq .
# Não deve ter erros de JSON

# Verificar campos obrigatórios
jq '.name, .short_name, .start_url, .display' src/manifest.json
```

### Testes falhando
```bash
# Verificar aplicação rodando
curl -I http://localhost:4200
# Deve retornar: HTTP/1.1 200 OK

# Executar com debug
DEBUG=puppeteer:* npm run test:pwa-installation
```

## 📊 Interpretação de Scores

| Score | Status | Ação |
|-------|--------|------|
| 90-100 | 🎉 Excelente | Deploy liberado |
| 80-89 | ✅ Bom | Pequenos ajustes opcionais |
| 70-79 | ⚠️ Regular | Melhorias recomendadas |
| < 70 | ❌ Ruim | Correções obrigatórias |

## 🔧 Comandos Úteis

```bash
# Instalar dependências de teste
npm install puppeteer --save-dev

# Servir com service worker
npm run serve:sw

# Testes individuais
npm run test:pwa-validation     # ~30s
npm run test:pwa-installation   # ~3min  
npm run test:pwa-cache         # ~2min

# Suite completa
npm run test:pwa-full          # ~8min
```

## 📱 Teste Manual Rápido

1. **Chrome Desktop**: Abrir DevTools > Lighthouse > PWA Audit
2. **Chrome Mobile**: Menu > "Adicionar à tela inicial"
3. **Offline**: DevTools > Network > Offline checkbox
4. **Performance**: DevTools > Performance > Record

## 📞 Suporte

- **Documentação completa**: `docs/PWA_TESTING_GUIDE.md`
- **Logs detalhados**: `reports/pwa_tests_*/`
- **Configuração**: `pwa-test-config.json`

---
**Última atualização**: Janeiro 2024