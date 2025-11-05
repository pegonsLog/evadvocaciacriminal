# Configuração de Ambiente

## Configuração das Chaves de API do Firebase

Para configurar o projeto localmente, você precisa criar os arquivos de ambiente com suas próprias chaves do Firebase.

### Passo 1: Copiar os templates

```bash
# Copie os arquivos template para os arquivos de ambiente
copy "src\environments\environment.template.ts" "src\environments\environment.ts"
copy "src\environments\environment.development.template.ts" "src\environments\environment.development.ts"
copy "src\environments\environment.production.template.ts" "src\environments\environment.production.ts"
```

### Passo 2: Configurar as chaves do Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Configurações do projeto** (ícone de engrenagem)
4. Na aba **Geral**, role até **Seus aplicativos**
5. Clique no ícone de configuração (`</>`) do seu app web
6. Copie as configurações do Firebase

### Passo 3: Substituir as chaves nos arquivos

Edite os arquivos criados no Passo 1 e substitua os valores placeholder pelas suas chaves reais:

- `YOUR_API_KEY_HERE` → sua apiKey
- `YOUR_PROJECT_ID` → seu projectId
- `YOUR_MESSAGING_SENDER_ID` → seu messagingSenderId
- `YOUR_APP_ID` → seu appId
- `YOUR_MEASUREMENT_ID` → seu measurementId

### Exemplo de configuração:

```typescript
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000/api",
  appName: "EV Advocacia Criminal",
  version: "0.0.0",
  firebase: {
    apiKey: "AIzaSyExample123456789",
    authDomain: "meu-projeto.firebaseapp.com",
    projectId: "meu-projeto",
    storageBucket: "meu-projeto.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456",
    measurementId: "G-ABCDEF1234",
  },
};
```

## Segurança

⚠️ **IMPORTANTE**: Nunca commite os arquivos de ambiente com chaves reais no Git. Os arquivos `environment.*.ts` estão no `.gitignore` para evitar vazamentos de API.

## Ambientes

- **environment.ts**: Ambiente padrão (desenvolvimento)
- **environment.development.ts**: Ambiente de desenvolvimento com debug ativado
- **environment.production.ts**: Ambiente de produção

## Deploy

Para deploy em produção, configure as variáveis de ambiente no seu provedor de hosting (Firebase Hosting, Vercel, etc.) ou use um sistema de CI/CD que injete as chaves durante o build.
