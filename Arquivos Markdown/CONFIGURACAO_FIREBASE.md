# 🔥 Configuração do Firebase - Instruções

## Arquivos de Environment Criados

✅ `src/environments/environment.ts` - Padrão (development)
✅ `src/environments/environment.development.ts` - Desenvolvimento  
✅ `src/environments/environment.production.ts` - Produção
✅ `src/environments/environment.local.ts` - Local (já existia)

## Como Adicionar as Configurações do Firebase

### Passo 1: Obter as Configurações

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Na aba **Geral**, role até **Seus apps**
5. Clique no ícone **</>** (Web) ou selecione seu app existente
6. Copie o objeto `firebaseConfig`

### Passo 2: Configurar os Environments

#### Para Desenvolvimento (`environment.development.ts`):

```typescript
firebase: {
  apiKey: "sua-api-key-aqui",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
}
```

#### Para Produção (`environment.production.ts`):

```typescript
firebase: {
  // Mesmas configurações ou projeto separado para produção
  apiKey: "sua-api-key-producao",
  authDomain: "seu-projeto-prod.firebaseapp.com",
  projectId: "seu-projeto-prod",
  storageBucket: "seu-projeto-prod.firebasestorage.app",
  messagingSenderId: "987654321",
  appId: "1:987654321:web:fedcba654321",
  measurementId: "G-YYYYYYYYYY"
}
```

### Passo 3: Testar a Configuração

Após adicionar as configurações:

```bash
# Testar em desenvolvimento
ng serve

# Testar build de produção
ng build --configuration production
```

## Configurações por Environment

| Environment     | Arquivo                      | Uso                                    |
| --------------- | ---------------------------- | -------------------------------------- |
| **Default**     | `environment.ts`             | Desenvolvimento padrão                 |
| **Development** | `environment.development.ts` | `ng serve --configuration development` |
| **Production**  | `environment.production.ts`  | `ng build --configuration production`  |
| **Local**       | `environment.local.ts`       | `ng serve --configuration local`       |

## Comandos Úteis

```bash
# Desenvolvimento (usa environment.ts)
ng serve

# Desenvolvimento específico
ng serve --configuration development

# Local (com suas chaves reais)
ng serve --configuration local

# Build de produção
ng build --configuration production

# Build de desenvolvimento
ng build --configuration development
```

## Segurança

⚠️ **IMPORTANTE:**

- Nunca commite chaves reais no Git
- Use o arquivo `environment.local.ts` para desenvolvimento local
- Configure variáveis de ambiente no servidor de produção
- Considere usar Firebase App Check para segurança adicional

## Status Atual

🟢 **Arquivos de environment criados**
🔄 **Aguardando configurações do Firebase**
🔄 **Pronto para testar após configuração**
