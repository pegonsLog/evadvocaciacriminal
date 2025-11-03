# Correção do Problema de Geração de Parcelas

## Problema Identificado
- Datas de vencimento duplicadas
- Algumas parcelas não sendo geradas corretamente
- Problema na lógica de cálculo de datas mensais

## Causa Raiz
O problema estava na função `gerarParcelas()` no arquivo `src/app/services/parcela.service.ts`:

### Código Anterior (Problemático):
```typescript
const dataVencimento = new Date(dataInicio);
dataVencimento.setMonth(dataInicio.getMonth() + i);
dataVencimento.setDate(diaVencimento);
```

**Problemas:**
1. `setMonth()` pode causar comportamentos inesperados quando o dia não existe no mês de destino
2. Exemplo: 31/01 + 1 mês = 03/03 (pula fevereiro)
3. Não havia limpeza de parcelas existentes antes de gerar novas

## Solução Implementada

### 1. Nova Lógica de Cálculo de Datas:
```typescript
// Criar data base para o mês correto
const dataVencimento = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + i, 1);

// Definir o dia de vencimento, ajustando para o último dia do mês se necessário
const ultimoDiaDoMes = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth() + 1, 0).getDate();
const diaFinal = Math.min(diaVencimento, ultimoDiaDoMes);
dataVencimento.setDate(diaFinal);
```

### 2. Prevenção de Duplicatas:
```typescript
// Primeiro, limpar parcelas existentes para evitar duplicatas
await this.deleteParcelasByCliente(cliente.id);
```

## Benefícios da Correção
1. **Datas Corretas**: Cada parcela terá a data de vencimento correta
2. **Sem Duplicatas**: Remove parcelas existentes antes de gerar novas
3. **Tratamento de Meses**: Ajusta automaticamente para meses com menos dias
4. **Sequência Correta**: Garante que todas as 10 parcelas sejam geradas em sequência

## Exemplo de Funcionamento
Para um cliente com 10 parcelas e dia de vencimento 10:
- Parcela 1: 10/01/2026
- Parcela 2: 10/02/2026
- Parcela 3: 10/03/2026
- ...
- Parcela 10: 10/10/2026

Se o dia de vencimento for 31 e o mês tiver menos dias:
- Janeiro: 31/01
- Fevereiro: 28/02 (ou 29 em ano bissexto)
- Março: 31/03