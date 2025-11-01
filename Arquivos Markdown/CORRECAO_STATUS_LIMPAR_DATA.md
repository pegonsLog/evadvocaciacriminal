# Correção do Status ao Limpar Data de Pagamento

## Problema Identificado
Quando o usuário limpava a data de pagamento, a parcela ficava com status "Atrasado" em vez de "Em Aberto", mesmo sem data de pagamento.

## Causa do Problema
A função `limparDataPagamento()` calculava imediatamente se a parcela estava atrasada baseado na data atual, fazendo com que parcelas vencidas ficassem como "atrasado" mesmo após limpar o pagamento.

## Solução Implementada

### 1. Modificação da Função limparDataPagamento()
**Arquivo**: `src/app/services/parcela.service.ts`

#### Antes:
```typescript
const hoje = new Date();
const diasAtraso = this.calcularDiasAtraso(parcela.dataVencimento, hoje);
const novoStatus = diasAtraso > 0 ? 'atrasado' : 'pendente';
```

#### Depois:
```typescript
// Sempre voltar para 'pendente' quando limpar pagamento
// A função atualizarStatusParcelas() irá verificar se está atrasado posteriormente
await updateDoc(parcelaDoc, {
  dataPagamento: null,
  valorPago: null,
  diasAtraso: 0,
  status: 'pendente',
  observacao: ''
});
```

### 2. Atualização Automática de Status
Adicionada chamada para `atualizarStatusParcelas()` nos componentes:

**Arquivos modificados:**
- `src/app/components/pagamentos/pagamento-lista/pagamento-lista.component.ts`
- `src/app/components/parcelas/parcela-lista/parcela-lista.component.ts`

```typescript
carregarParcelas(): void {
  // Atualizar status das parcelas antes de carregar
  this.parcelaService.atualizarStatusParcelas();
  
  this.parcelaService.getParcelas().subscribe(parcelas => {
    // ... resto do código
  });
}
```

## Como Funciona Agora

1. **Limpar Data**: Parcela volta para status "Em Aberto" (pendente)
2. **Carregar Lista**: Sistema verifica automaticamente se há parcelas atrasadas
3. **Status Correto**: Parcelas são atualizadas para "Atrasado" apenas se necessário

## Resultado
✅ Ao limpar data de pagamento, parcela volta para "Em Aberto"
✅ Sistema atualiza automaticamente status de parcelas vencidas
✅ Comportamento consistente e intuitivo para o usuário