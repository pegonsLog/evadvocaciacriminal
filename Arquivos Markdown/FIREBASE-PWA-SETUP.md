# Firebase PWA Deployment Setup

## Problema Atual
O erro "resolving hosting target of a site with no site name or target name" indica que há um problema com a configuração do Firebase ou autenticação.

## Soluções

### 1. Autenticação Firebase
```bash
# Fazer login no Firebase
firebase login

# Verificar se está logado
firebase projects:list
```

### 2. Configurar Projeto Correto
```bash
# Listar projetos disponíveis
firebase projects:list

# Configurar o projeto correto (substitua pelo nome real do seu projeto)
firebase use --add

# Ou se souber o nome do projeto:
firebase use [SEU_PROJETO_ID]
```

### 3. Verificar Configuração
```bash
# Verificar configuração atual
firebase use

# Verificar se o projeto tem hosting habilitado
firebase hosting:sites:list
```

### 4. Deploy PWA
Após resolver a autenticação, use um dos comandos abaixo:

```bash
# Deploy completo
firebase deploy

# Deploy apenas hosting
firebase deploy --only hosting

# Deploy com projeto específico
firebase deploy --project [SEU_PROJETO_ID]
```

## Configuração PWA Implementada

### ✅ Angular Build Configuration
- Service Worker habilitado
- Assets PWA incluídos (ícones, manifest, splash screens)
- Configuração otimizada para produção

### ✅ Firebase Hosting Headers
- Cache apropriado para Service Worker
- Headers de segurança
- Cache otimizado para assets PWA
- Content-Type correto para manifests

### ✅ Service Worker Configuration
- Cache para app shell
- Cache para assets estáticos
- Cache para APIs Firebase
- Cache para Google Fonts

## Arquivos PWA Gerados
Após `npm run build`, os seguintes arquivos são gerados:

- `ngsw-worker.js` - Service Worker principal
- `ngsw.json` - Configuração do Service Worker
- `manifest.webmanifest` - Web App Manifest
- `manifest.json` - Manifest alternativo
- `safety-worker.js` - Worker de fallback
- `assets/icons/` - Ícones PWA (8 tamanhos)
- `assets/splash/` - Splash screens

## Teste Local
Para testar localmente sem Firebase:

```bash
# Instalar servidor HTTP simples
npm install -g http-server

# Servir o build
cd dist/evadvociacriminal
http-server -p 8080

# Acessar http://localhost:8080
```

## Validação PWA
Use o script de teste incluído:

```bash
node test-pwa-deployment.js
```

## Próximos Passos
1. Resolver autenticação Firebase
2. Configurar projeto correto
3. Executar deploy
4. Testar PWA em dispositivo móvel
5. Verificar funcionamento offline

## Troubleshooting

### Se o projeto não existir:
1. Criar novo projeto no Firebase Console
2. Habilitar Hosting
3. Atualizar `.firebaserc` com o ID correto

### Se não tiver acesso:
1. Verificar permissões no Firebase Console
2. Solicitar acesso ao proprietário do projeto
3. Usar conta correta no `firebase login`