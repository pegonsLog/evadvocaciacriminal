# Sistema de Autenticação - EV Advocacia Criminal

## 📋 Visão Geral

Sistema de autenticação implementado com Firebase Authentication e Firestore, com dois níveis de acesso:
- **Administrador**: Acesso completo ao sistema, incluindo gerenciamento de usuários e exclusão de registros
- **Usuário Comum**: Acesso ao sistema sem permissão para deletar registros

## 🔐 Funcionalidades Implementadas

### 1. Autenticação
- ✅ Tela de login com validação de formulário
- ✅ Sistema de logout
- ✅ Proteção de rotas com guards
- ✅ Redirecionamento automático após login
- ✅ Persistência de sessão

### 2. Autorização por Roles
- ✅ **UserRole.ADMIN**: Administrador com acesso total
- ✅ **UserRole.COMUM**: Usuário comum com acesso limitado

### 3. Gerenciamento de Usuários (Apenas Admin)
- ✅ Listar todos os usuários
- ✅ Criar novos usuários
- ✅ Ativar/Desativar usuários
- ✅ Deletar usuários
- ✅ Visualizar informações de role e status

### 4. Restrições de Acesso
- ✅ Usuários comuns **não podem deletar** clientes
- ✅ Botão de exclusão oculto para usuários comuns
- ✅ Validação no backend para prevenir exclusões não autorizadas
- ✅ Rota `/usuarios` acessível apenas para administradores

## 🚀 Como Usar

### Primeiro Acesso - Criar Usuário Administrador

Como o sistema não possui usuários inicialmente, você precisa criar o primeiro usuário administrador manualmente no Firebase:

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **evac-pagamentos**
3. Vá em **Authentication** > **Users** > **Add user**
4. Crie um usuário com email e senha
5. Copie o **UID** do usuário criado
6. Vá em **Firestore Database** > **Start collection**
7. Crie uma collection chamada `users`
8. Adicione um documento com o UID como ID e os seguintes campos:

```json
{
  "uid": "UID_DO_USUARIO",
  "email": "admin@evadvocacia.com",
  "displayName": "Administrador",
  "role": "ADMIN",
  "active": true,
  "createdAt": "DATA_ATUAL",
  "updatedAt": "DATA_ATUAL"
}
```

### Login no Sistema

1. Acesse a aplicação
2. Você será redirecionado para `/login`
3. Entre com as credenciais do administrador
4. Após o login, você terá acesso completo ao sistema

### Criar Novos Usuários

1. Faça login como administrador
2. Clique em **Usuários** no menu superior
3. Clique em **+ Adicionar Usuário**
4. Preencha os dados:
   - Nome Completo
   - Email
   - Senha (mínimo 6 caracteres)
   - Tipo de Usuário (Comum ou Administrador)
5. Clique em **Criar Usuário**

## 📁 Estrutura de Arquivos Criados

```
src/app/
├── models/
│   └── user.model.ts                    # Interfaces e enums de usuário
├── services/
│   └── auth.service.ts                  # Serviço de autenticação
├── guards/
│   ├── auth.guard.ts                    # Guard de autenticação
│   ├── admin.guard.ts                   # Guard de administrador
│   └── role.guard.ts                    # Guard genérico de roles
├── components/
│   └── auth/
│       ├── login/                       # Componente de login
│       │   ├── login.component.ts
│       │   ├── login.component.html
│       │   └── login.component.scss
│       └── user-management/             # Gerenciamento de usuários
│           ├── user-management.component.ts
│           ├── user-management.component.html
│           └── user-management.component.scss
└── app.routes.ts                        # Rotas protegidas
```

## 🔒 Guards Implementados

### authGuard
Protege rotas que requerem autenticação. Redireciona para `/login` se não autenticado.

```typescript
canActivate: [authGuard]
```

### adminGuard
Protege rotas exclusivas para administradores. Redireciona para `/home` se não for admin.

```typescript
canActivate: [adminGuard]
```

### roleGuard
Guard genérico que aceita múltiplas roles.

```typescript
canActivate: [roleGuard],
data: { roles: [UserRole.ADMIN, UserRole.COMUM] }
```

## 🎨 Interface do Usuário

### Navbar
- Exibida apenas quando autenticado
- Mostra nome do usuário logado
- Badge indicando tipo de usuário (Admin/Comum)
- Menu dropdown com opção de logout
- Link "Usuários" visível apenas para administradores

### Tela de Login
- Design moderno com gradiente
- Validação em tempo real
- Mensagens de erro claras
- Indicador de loading durante autenticação

### Gerenciamento de Usuários
- Tabela responsiva com lista de usuários
- Formulário para criar novos usuários
- Ações: Ativar/Desativar e Deletar
- Badges coloridos para roles e status
- Proteção contra auto-exclusão

## 🛡️ Segurança

### Regras do Firestore (Recomendadas)

Configure as seguintes regras no Firestore para maior segurança:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Função para verificar se é admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }
    
    // Função para verificar se está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Regras para usuários
    match /users/{userId} {
      // Apenas admins podem ler todos os usuários
      allow read: if isAdmin();
      // Usuário pode ler seus próprios dados
      allow read: if request.auth.uid == userId;
      // Apenas admins podem criar, atualizar ou deletar
      allow create, update, delete: if isAdmin();
    }
    
    // Regras para clientes
    match /clientes/{clienteId} {
      // Qualquer usuário autenticado pode ler
      allow read: if isAuthenticated();
      // Qualquer usuário autenticado pode criar e atualizar
      allow create, update: if isAuthenticated();
      // Apenas admins podem deletar
      allow delete: if isAdmin();
    }
    
    // Adicione regras similares para outras collections
  }
}
```

## 📝 Notas Importantes

1. **Primeiro Login**: Você deve criar o primeiro usuário administrador manualmente no Firebase Console
2. **Senhas**: O Firebase requer senhas com no mínimo 6 caracteres
3. **Emails**: Devem ser únicos no sistema
4. **Usuários Inativos**: Não conseguem fazer login mesmo com credenciais corretas
5. **Auto-exclusão**: Administradores não podem desativar ou deletar suas próprias contas

## 🐛 Troubleshooting

### Erro: "Dados do usuário não encontrados"
- Verifique se o documento do usuário existe no Firestore na collection `users`
- O UID do documento deve corresponder ao UID do Firebase Authentication

### Erro: "Usuário inativo"
- O campo `active` do usuário está como `false`
- Um administrador deve ativar o usuário

### Não consigo acessar a rota `/usuarios`
- Verifique se você está logado como administrador
- Confirme que o campo `role` no Firestore está como `"ADMIN"`

### Botão de deletar não aparece
- Isso é esperado para usuários comuns
- Apenas administradores veem o botão de exclusão

## 🔄 Fluxo de Autenticação

```
1. Usuário acessa a aplicação
   ↓
2. AuthGuard verifica autenticação
   ↓
3. Se não autenticado → Redireciona para /login
   ↓
4. Usuário faz login
   ↓
5. AuthService valida credenciais no Firebase
   ↓
6. AuthService busca dados do usuário no Firestore
   ↓
7. Verifica se usuário está ativo
   ↓
8. Atualiza BehaviorSubject com dados do usuário
   ↓
9. Redireciona para página solicitada ou /home
   ↓
10. Guards verificam permissões em cada navegação
```

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com o desenvolvedor do sistema.
