# Solução para Erro de Permissões ao Criar Usuário

## Problema Identificado

```
Erro ao buscar usuários: FirebaseError: Missing or insufficient permissions
Erro ao carregar usuários: FirebaseError: Missing or insufficient permissions
Erro no registro: FirebaseError: Missing or insufficient permissions
Erro ao criar usuário: Error: Missing or insufficient permissions
```

## Causa do Problema

O sistema tem um problema de "bootstrap" - você precisa ser admin para criar usuários, mas precisa criar o primeiro usuário admin. As regras atualizadas já resolvem isso parcialmente.

## Soluções (Escolha uma)

### Solução 1: Aplicar as Regras Atualizadas (RECOMENDADA)

1. **Acesse o Firebase Console**

   - Vá para [Firebase Console](https://console.firebase.google.com)
   - Selecione seu projeto `evadvociacriminal`
   - Clique em **Firestore Database** → **Rules**

2. **Copie as Novas Regras**

   - Copie todo o conteúdo do arquivo `firestore.rules` (que foi atualizado)
   - Cole no editor de regras do Firebase Console
   - Clique em **Publish**

3. **As regras agora permitem:**
   - Criação do primeiro usuário admin com email `evadvocaciacriminal@gmail.com`
   - Admins podem criar outros usuários
   - Verificação de admin por email OU por role no documento

### Solução 2: Regras Temporárias (Se a Solução 1 não funcionar)

Se ainda houver problemas, use estas regras temporárias mais permissivas:

```javascript
// Na seção de usuários, substitua a regra de criação por:
allow create: if isAuthenticated() &&
                 request.resource.data.keys().hasAll(['uid', 'email', 'displayName', 'role', 'active', 'createdAt', 'updatedAt']) &&
                 request.resource.data.uid is string &&
                 request.resource.data.email is string &&
                 request.resource.data.displayName is string &&
                 request.resource.data.role in ['ADMIN', 'COMUM'] &&
                 request.resource.data.active is bool;
```

**⚠️ IMPORTANTE**: Após criar o usuário admin, volte para as regras mais restritivas!

## Passos para Testar

1. **Aplique as regras no Firebase Console**
2. **Faça login na aplicação** com qualquer conta
3. **Vá para Gerenciamento de Usuários**
4. **Crie o usuário admin principal:**

   - Email: `evadvocaciacriminal@gmail.com`
   - Nome: `Administrador`
   - Role: `ADMIN`
   - Senha: (defina uma senha segura)

5. **Teste a criação de outros usuários** após ter o admin criado

## Verificação de Sucesso

Após aplicar as correções, você deve conseguir:

- ✅ Acessar a lista de usuários sem erro
- ✅ Criar o primeiro usuário admin
- ✅ Criar outros usuários como admin
- ✅ Não ver mais erros de permissão no console

## Próximos Passos

1. Crie o usuário admin principal
2. Teste a criação de usuários comuns
3. Se tudo funcionar, mantenha as regras atuais
4. Se necessário, ajuste as permissões conforme a necessidade do escritório

## Contato para Suporte

Se ainda houver problemas após seguir estes passos, verifique:

- Se as regras foram publicadas corretamente no Firebase
- Se você está logado na aplicação
- Se há erros no console do navegador (F12)
