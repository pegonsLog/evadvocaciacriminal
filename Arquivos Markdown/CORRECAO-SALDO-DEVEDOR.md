# Correção do Cálculo do Saldo Devedor

## 🐛 Problema Identificado

**Cenário**: Cliente com valor do contrato R$ 32.000 e entrada R$ 2.000

- **Esperado**: Saldo devedor = R$ 30.000 (32.000 - 2.000)
- **Atual (incorreto)**: Saldo devedor = R$ 32.000

## 🔍 Causa Raiz

O cálculo do saldo devedor estava incorreto em vários lugares do código:

### ❌ **Fórmula Incorreta (antes)**:

```typescript
saldoDevedor = valorTotal - totalPago;
```

### ✅ **Fórmula Correta (depois)**:

```typescript
const valorParcelado = valorTotal - valorEntrada;
saldoDevedor = valorParcelado - totalPago;
```

## 🔧 Correções Implementadas

### 1. **ClienteDetalhesComponent** (`cliente-detalhes.component.ts`)

```typescript
// ANTES
this.saldoDevedor = this.cliente.contrato.valorTotal - this.totalPago;

// DEPOIS
const valorParcelado = this.cliente.contrato.valorTotal - this.cliente.contrato.valorEntrada;
this.saldoDevedor = valorParcelado - this.totalPago;
```

### 2. **HomeComponent** (`home.component.ts`)

```typescript
// ANTES
const saldoDevedor = cliente.contrato.valorTotal - totalPago;

// DEPOIS
const valorParcelado = cliente.contrato.valorTotal - cliente.contrato.valorEntrada;
const saldoDevedor = valorParcelado - totalPago;
```

### 3. **ClienteService** (`cliente.service.ts`) - 2 ocorrências

```typescript
// ANTES
const saldoDevedor = cliente.contrato.valorTotal - totalPago;

// DEPOIS
const valorParcelado = cliente.contrato.valorTotal - cliente.contrato.valorEntrada;
const saldoDevedor = valorParcelado - totalPago;
```

## 📊 Exemplo de Cálculo Correto

### Cenário do usuário:

- **Valor do contrato**: R$ 32.000
- **Entrada**: R$ 2.000
- **Valor parcelado**: R$ 30.000 (32.000 - 2.000)
- **Total pago em parcelas**: R$ 0 (ainda não pagou nenhuma parcela)

### Resultado:

- **Saldo devedor**: R$ 30.000 (30.000 - 0) ✅

## 🎯 Impacto das Correções

### Componentes Afetados:

1. **Página de detalhes do cliente**: Saldo devedor agora correto
2. **Dashboard (Home)**: Cards de resumo com saldo correto
3. **Serviços**: Cálculos de resumo de pagamento corrigidos

### Funcionalidades Corrigidas:

- ✅ Exibição do saldo devedor na página de detalhes
- ✅ Cards de resumo no dashboard
- ✅ Cálculos de resumo de pagamentos
- ✅ Métricas financeiras em geral

## 🧮 Lógica de Negócio Correta

### Conceitos:

1. **Valor Total**: Valor completo do contrato
2. **Entrada**: Valor pago à vista no momento da contratação
3. **Valor Parcelado**: Valor que será pago em parcelas (Total - Entrada)
4. **Total Pago**: Soma de todas as parcelas já pagas
5. **Saldo Devedor**: Valor que ainda falta pagar (Valor Parcelado - Total Pago)

### Fórmula Final:

```
Saldo Devedor = (Valor Total - Entrada) - Total Pago em Parcelas
```

## ✅ Status

- **Arquivos corrigidos**: 3 arquivos
- **Ocorrências corrigidas**: 4 cálculos
- **Testes**: Sem erros de compilação
- **Funcionalidade**: Saldo devedor agora calcula corretamente

O problema foi resolvido! Agora o saldo devedor mostra R$ 30.000 conforme esperado. 🎉
