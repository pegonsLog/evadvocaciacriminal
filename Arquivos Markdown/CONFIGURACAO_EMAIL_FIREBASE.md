# Configuração de Email Firebase - Evitar Spam

## 🚨 Problema Atual

Os emails de recuperação de senha estão indo para a pasta de spam.

## 📧 Configurações no Firebase Console

### 1. Personalizar Templates de Email

1. **Acesse Firebase Console** → Authentication → Templates
2. **Clique em "Password reset"**
3. **Configure:**

#### Template Personalizado:

```
Assunto: Redefinir senha - EV Advocacia Criminal

Corpo do email:
Olá,

Você solicitou a redefinição de senha para sua conta no sistema EV Advocacia Criminal.

Clique no link abaixo para criar uma nova senha:
%LINK%

Este link expira em 1 hora por motivos de segurança.

Se você não solicitou esta redefinição, ignore este email.

---
EV Advocacia Criminal
Sistema de Gestão de Pagamentos
```

### 2. Configurar Domínio Personalizado

#### No Firebase Console:

1. **Authentication** → **Settings** → **Authorized domains**
2. **Adicione seu domínio** (ex: `evadvocacia.com.br`)

#### Configurar DNS (se tiver domínio próprio):

```
Tipo: TXT
Nome: @
Valor: v=spf1 include:_spf.google.com ~all
```

### 3. Configurações de Remetente

1. **Authentication** → **Templates** → **SMTP settings**
2. **Configure:**
   - **Nome do remetente**: `EV Advocacia Criminal`
   - **Email de resposta**: `noreply@evadvocacia.com.br`

## 🛠️ Soluções Técnicas

### Solução 1: Melhorar Mensagem para Usuário

Vou atualizar a mensagem para orientar sobre spam:

### Solução 2: Configurações no Firebase Console

#### 1. Personalizar Template de Email

1. **Firebase Console** → **Authentication** → **Templates**
2. **Selecione "Password reset"**
3. **Configure:**

**Assunto sugerido:**

```
Redefinir senha - EV Advocacia Criminal
```

**Corpo do email sugerido:**

```
Olá,

Você solicitou a redefinição de senha para sua conta no sistema EV Advocacia Criminal.

Clique no link abaixo para criar uma nova senha:
%LINK%

Este link expira em 1 hora por motivos de segurança.

Se você não solicitou esta redefinição, ignore este email.

Atenciosamente,
Equipe EV Advocacia Criminal
Sistema de Gestão de Pagamentos

---
Este é um email automático, não responda.
```

#### 2. Configurar Domínio Autorizado

1. **Authentication** → **Settings** → **Authorized domains**
2. **Adicione:** `localhost` (desenvolvimento) e seu domínio de produção

### Solução 3: Orientações para Usuários

#### Mensagem Melhorada no Sistema

✅ **Implementado:** Modal com instruções detalhadas sobre:

- Verificar pasta de spam
- Tempo de expiração do link
- Adicionar remetente aos contatos confiáveis
- Aguardar alguns minutos se não receber

### Solução 4: Configurações de DNS (Se tiver domínio próprio)

#### Registros SPF e DKIM:

```
Tipo: TXT
Nome: @
Valor: v=spf1 include:_spf.google.com include:_spf.firebase.com ~all

Tipo: TXT
Nome: firebase._domainkey
Valor: (fornecido pelo Firebase quando configurar domínio personalizado)
```

### Solução 5: Alternativas Técnicas

#### Implementar Sistema de Email Próprio (Avançado):

1. **SendGrid** ou **Mailgun** para emails transacionais
2. **Configurar webhook** no Firebase Functions
3. **Templates personalizados** com melhor deliverability

## 📊 Fatores que Afetam Deliverability

### ❌ Problemas Comuns:

- Remetente genérico (noreply@firebase.com)
- Falta de autenticação SPF/DKIM
- Conteúdo genérico do template
- Domínio não verificado

### ✅ Melhorias Aplicadas:

- Mensagem clara para verificar spam
- Instruções para adicionar aos contatos
- Template personalizado (recomendado)
- Orientações sobre tempo de expiração

## 🎯 Próximos Passos Recomendados

1. **Imediato:** Orientar usuários sobre spam (✅ implementado)
2. **Curto prazo:** Personalizar template no Firebase Console
3. **Médio prazo:** Configurar domínio próprio
4. **Longo prazo:** Considerar serviço de email dedicado

## 📞 Suporte aos Usuários

**Orientação padrão:**
"Se não recebeu o email de recuperação, verifique a pasta de spam/lixo eletrônico. Adicione noreply@firebase.com aos seus contatos confiáveis para evitar que futuros emails vão para o spam."
