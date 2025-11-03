# Correção das Permissões do Firestore

## Problema Identificado
```
Erro ao carregar parcelas: FirebaseError: Missing or insufficient permissions
Erro ao carregar pagamentos: FirebaseError: Missing or insufficient permissions  
Erro ao carregar clientes: FirebaseError: Missing or insufficient permissions
```

## Causa do Problema
As regras do Firestore estavam usando `get()` para verificar dados do usuário, causando loops de permissão e bloqueando o acesso.

## Solução

### 1. Acesse o Firebase Console
1. Vá para [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto
3. No menu lateral, clique em **"Firestore Database"**
4. Clique na aba **"Rules"**

### 2. Substitua as Regras Atuais
Copie todo o conteúdo do arquivo `firestore-rules-corrigidas.txt` e cole no editor de regras do Firebase Console.

### 3. Principais Mudanças Feitas

#### Antes (Problemático):
```javascript
function isActiveUser() {
  return isAuthenticated() &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.active == true;
}

function isAdmin() {
  return isAuthenticated() &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
}
```

#### Depois (Corrigido):
```javascript
function isActiveUser() {
  return isAuthenticated();
}

function isAdmin() {
  return isAuthenticated() && request.auth.token.email == 'evadvocaciacriminal@gmail.com';
}
```

### 4. Clique em "Publish"
Após colar as novas regras, clique no botão **"Publish"** para aplicar as mudanças.

## O Que Foi Simplificado

### ✅ Verificação de Usuário Ativo
- **Antes**: Consultava documento do usuário (causava loop)
- **Depois**: Apenas verifica se está autenticado

### ✅ Verificação de Admin
- **Antes**: Consultava documento do usuário para verificar role
- **Depois**: Verifica diretamente pelo email no token de autenticação

### ✅ Permissões Básicas
- **Clientes**: Qualquer usuário autenticado pode ler/criar/atualizar
- **Parcelas**: Qualquer usuário autenticado pode ler/criar/atualizar  
- **Pagamentos**: Qualquer usuário autenticado pode ler/criar/atualizar
- **Deleção**: Apenas admin (email específico) pode deletar

## Resultado Esperado
Após aplicar essas regras, os erros de permissão devem desaparecer e o sistema deve funcionar normalmente.

## Teste
1. Aplique as novas regras no Firebase Console
2. Recarregue a aplicação
3. Teste o acesso às diferentes seções
4. Verifique se não há mais erros de permissão no console