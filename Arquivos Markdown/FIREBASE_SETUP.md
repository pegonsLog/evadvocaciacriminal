# Configuração do Firebase

## Passo 1: Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Dê um nome ao projeto (ex: "evadvocaciacriminal")
4. Siga os passos de criação

## Passo 2: Criar um Web App

1. No console do Firebase, clique no ícone de Web (</>) para adicionar um app
2. Registre o app com um nome (ex: "EV Advocacia Criminal")
3. Copie as credenciais do Firebase Config

## Passo 3: Configurar Firestore Database

1. No menu lateral, vá em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha o modo de produção ou teste
4. Selecione a localização (ex: southamerica-east1 para São Paulo)

## Passo 4: Configurar Regras do Firestore

No Firestore Database, vá em "Regras" e configure:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /clientes/{clienteId} {
      allow read, write: if true; // Para desenvolvimento
    }
    match /pagamentos/{pagamentoId} {
      allow read, write: if true; // Para desenvolvimento
    }
  }
}
```

**IMPORTANTE**: Em produção, configure regras de segurança adequadas!

## Passo 5: Adicionar Credenciais ao Projeto

1. Copie as credenciais do Firebase Config
2. Abra o arquivo: `src/environments/environment.ts`
3. Substitua os valores placeholder pelas suas credenciais:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  appName: 'EV Advocacia Criminal',
  version: '0.0.0',
  firebase: {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJECT_ID.firebaseapp.com",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_PROJECT_ID.appspot.com",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
  }
};
```

## Passo 6: Testar a Conexão

1. Salve o arquivo de configuração
2. Reinicie o servidor de desenvolvimento: `ng serve`
3. Abra o navegador e teste cadastrando um cliente
4. Verifique no Firebase Console se os dados foram salvos

## Estrutura das Coleções

### Coleção: `clientes`
```json
{
  "nome": "string",
  "cpf": "string",
  "telefone": "string",
  "email": "string",
  "endereco": "string",
  "dataCadastro": "timestamp",
  "compra": {
    "valorTotal": "number",
    "numeroParcelas": "number",
    "valorParcela": "number",
    "dataCompra": "timestamp"
  }
}
```

### Coleção: `pagamentos`
```json
{
  "clienteId": "string",
  "clienteNome": "string",
  "valorPago": "number",
  "dataPagamento": "timestamp",
  "observacao": "string"
}
```

## Troubleshooting

### Erro de permissão
- Verifique as regras do Firestore
- Certifique-se de que as regras permitem leitura e escrita

### Dados não aparecem
- Verifique o console do navegador para erros
- Confirme que as credenciais estão corretas
- Verifique se o Firestore está ativado no projeto

### Erro de CORS
- Certifique-se de que o domínio está autorizado no Firebase Console
- Em desenvolvimento, localhost deve funcionar automaticamente
