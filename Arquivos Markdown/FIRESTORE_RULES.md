# Regras de Segurança do Firestore

## 📋 Como Aplicar as Regras

### Opção 1: Copiar e Colar no Console (Recomendado)

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **evac-pagamentos**
3. Vá em **Firestore Database** > **Rules**
4. Copie todo o conteúdo do arquivo `firestore.rules` deste projeto
5. Cole no editor de regras do Firebase Console
6. Clique em **Publish** (Publicar)

### Opção 2: Deploy via Firebase CLI

Se você tem o Firebase CLI instalado:

```bash
firebase deploy --only firestore:rules
```

## 🔒 O que as Regras Protegem

### 1. **Usuários (Collection: users)**

#### Leitura
- ✅ **Administradores**: Podem ler todos os usuários
- ✅ **Usuários**: Podem ler apenas seus próprios dados

#### Criação
- ✅ **Apenas Administradores** podem criar novos usuários
- ✅ Validação de campos obrigatórios: `uid`, `email`, `displayName`, `role`, `active`, `createdAt`, `updatedAt`
- ✅ Validação de tipos de dados
- ✅ Role deve ser `ADMIN` ou `COMUM`

#### Atualização
- ✅ **Administradores**: Podem atualizar qualquer usuário
- ✅ **Usuários**: Podem atualizar apenas seus próprios dados (exceto `role`, `active` e `uid`)

#### Deleção
- ✅ **Apenas Administradores** podem deletar usuários

---

### 2. **Clientes (Collection: clientes)**

#### Leitura
- ✅ Qualquer usuário **autenticado e ativo** pode ler

#### Criação e Atualização
- ✅ Qualquer usuário **autenticado e ativo** pode criar e atualizar
- ✅ Validação de campos obrigatórios: `nome`, `cpf`, `telefone`, `compra`
- ✅ Validação de tipos de dados

#### Deleção
- ✅ **Apenas Administradores** podem deletar clientes
- ✅ Usuário deve estar ativo

---

### 3. **Parcelas (Collection: parcelas)**

#### Leitura
- ✅ Qualquer usuário **autenticado e ativo** pode ler

#### Criação e Atualização
- ✅ Qualquer usuário **autenticado e ativo** pode criar e atualizar
- ✅ Validação de campos obrigatórios: `clienteId`, `numeroParcela`, `valor`, `dataVencimento`, `status`
- ✅ Status deve ser: `pendente`, `paga` ou `atrasada`
- ✅ Validação de tipos de dados

#### Deleção
- ✅ **Apenas Administradores** podem deletar parcelas
- ✅ Usuário deve estar ativo

---

### 4. **Pagamentos (Collection: pagamentos)**

#### Leitura
- ✅ Qualquer usuário **autenticado e ativo** pode ler

#### Criação e Atualização
- ✅ Qualquer usuário **autenticado e ativo** pode criar e atualizar
- ✅ Validação de campos obrigatórios: `clienteId`, `valor`, `dataPagamento`
- ✅ Validação de tipos de dados

#### Deleção
- ✅ **Apenas Administradores** podem deletar pagamentos
- ✅ Usuário deve estar ativo

---

## 🛡️ Funções de Segurança

### `isAuthenticated()`
Verifica se o usuário está autenticado no Firebase Authentication.

### `isAdmin()`
Verifica se o usuário está autenticado E tem role `ADMIN` no Firestore.

### `isActiveUser()`
Verifica se o usuário está autenticado E está com status `active: true`.

### `isOwner(userId)`
Verifica se o usuário autenticado é o dono do documento (UID corresponde).

---

## 🔐 Níveis de Segurança

### Nível 1: Autenticação
Todas as operações requerem que o usuário esteja autenticado.

### Nível 2: Status Ativo
Operações de leitura/escrita requerem que o usuário esteja ativo (`active: true`).

### Nível 3: Role de Administrador
Operações de deleção e gerenciamento de usuários requerem role `ADMIN`.

### Nível 4: Validação de Dados
Todas as operações de escrita validam:
- Campos obrigatórios
- Tipos de dados
- Valores permitidos (enums)

---

## ⚠️ Regra Padrão

Qualquer collection ou documento não especificado nas regras acima será **NEGADO** por padrão:

```javascript
match /{document=**} {
  allow read, write: if false;
}
```

Isso garante que apenas as collections especificadas sejam acessíveis.

---

## 🧪 Testando as Regras

Após publicar as regras, você pode testá-las no Firebase Console:

1. Vá em **Firestore Database** > **Rules**
2. Clique na aba **Rules Playground**
3. Simule operações com diferentes usuários e roles
4. Verifique se as permissões estão corretas

### Exemplos de Teste:

#### Teste 1: Usuário Comum tentando deletar cliente
- **Operação**: `delete`
- **Collection**: `clientes/abc123`
- **Auth UID**: `user123` (role: COMUM)
- **Resultado Esperado**: ❌ NEGADO

#### Teste 2: Admin deletando cliente
- **Operação**: `delete`
- **Collection**: `clientes/abc123`
- **Auth UID**: `admin123` (role: ADMIN)
- **Resultado Esperado**: ✅ PERMITIDO

#### Teste 3: Usuário inativo tentando ler clientes
- **Operação**: `get`
- **Collection**: `clientes/abc123`
- **Auth UID**: `user123` (active: false)
- **Resultado Esperado**: ❌ NEGADO

---

## 📝 Notas Importantes

1. **Usuários Inativos**: Não podem realizar nenhuma operação, mesmo estando autenticados
2. **Validação de Dados**: As regras validam a estrutura dos dados antes de permitir a escrita
3. **Performance**: As funções `isAdmin()` e `isActiveUser()` fazem uma leitura adicional do documento do usuário
4. **Segurança em Camadas**: As regras implementam múltiplas camadas de segurança (autenticação + autorização + validação)

---

## 🔄 Atualizando as Regras

Sempre que modificar as regras:

1. Teste localmente se possível
2. Publique no Firebase Console
3. Teste no ambiente de produção
4. Monitore os logs de segurança

---

## 📞 Troubleshooting

### Erro: "Missing or insufficient permissions"
- Verifique se o usuário está autenticado
- Verifique se o usuário está ativo
- Verifique se o usuário tem a role necessária
- Verifique se os campos obrigatórios estão presentes

### Erro: "Document doesn't exist"
- Certifique-se que o documento do usuário existe na collection `users`
- O UID do documento deve corresponder ao UID do Firebase Authentication

### Regras não estão funcionando
- Aguarde alguns segundos após publicar (propagação)
- Limpe o cache do navegador
- Verifique se publicou corretamente no Firebase Console
