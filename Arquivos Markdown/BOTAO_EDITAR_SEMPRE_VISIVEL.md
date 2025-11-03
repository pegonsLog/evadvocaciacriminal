# Botão de Editar Sempre Visível

## Mudanças Realizadas

### 1. Componente de Pagamentos
**Arquivo**: `src/app/components/pagamentos/pagamento-lista/pagamento-lista.component.html`

#### Antes:
```html
<div class="btn-group" role="group" *ngIf="parcela.status !== 'pago'">
  <button class="btn btn-sm btn-success btn-action" (click)="abrirModalPagamento(parcela)">
    <i class="bi bi-check-circle"></i>
  </button>
</div>
<div class="btn-group" role="group" *ngIf="parcela.status === 'pago'">
  <span class="text-success me-2">
    <i class="bi bi-check-circle-fill"></i> Pago
  </span>
  <button class="btn btn-sm btn-warning btn-action" (click)="editarDataPagamento(parcela)">
    <i class="bi bi-pencil"></i>
  </button>
</div>
```

#### Depois:
```html
<div class="btn-group" role="group">
  <button class="btn btn-sm btn-success btn-action" (click)="abrirModalPagamento(parcela)"
    title="Registrar Pagamento" *ngIf="parcela.status !== 'pago'">
    <i class="bi bi-check-circle"></i>
  </button>
  <span class="text-success me-2" *ngIf="parcela.status === 'pago'">
    <i class="bi bi-check-circle-fill"></i> Pago
  </span>
  <button class="btn btn-sm btn-warning btn-action" (click)="editarDataPagamento(parcela)"
    title="Editar Data de Pagamento">
    <i class="bi bi-pencil"></i>
  </button>
</div>
```

### 2. Componente de Parcelas
**Arquivo**: `src/app/components/parcelas/parcela-lista/parcela-lista.component.html`

#### Antes:
```html
<button *ngIf="parcela.status !== 'pago'" class="btn btn-sm btn-success">
  <i class="bi bi-check-circle"></i> Pagar
</button>
<span *ngIf="parcela.status === 'pago'" class="text-success">
  <i class="bi bi-check-circle-fill"></i> Pago
</span>
```

#### Depois:
```html
<div class="btn-group" role="group">
  <button *ngIf="parcela.status !== 'pago'" class="btn btn-sm btn-success">
    <i class="bi bi-check-circle"></i> Pagar
  </button>
  <span *ngIf="parcela.status === 'pago'" class="text-success me-2">
    <i class="bi bi-check-circle-fill"></i> Pago
  </span>
  <button class="btn btn-sm btn-warning btn-action" (click)="editarParcela(parcela)">
    <i class="bi bi-pencil"></i>
  </button>
</div>
```

### 3. Nova Função no Componente de Parcelas
**Arquivo**: `src/app/components/parcelas/parcela-lista/parcela-lista.component.ts`

```typescript
editarParcela(parcela: Parcela): void {
  // Redirecionar para a página de pagamentos onde há mais opções de edição
  this.router.navigate(['/pagamentos', this.clienteId]);
}
```

## Resultado

### Componente de Pagamentos:
- ✅ Botão de editar sempre visível
- ✅ Botão de registrar pagamento só aparece para parcelas não pagas
- ✅ Indicador "Pago" só aparece para parcelas pagas

### Componente de Parcelas:
- ✅ Botão de editar sempre visível
- ✅ Redireciona para página de pagamentos (mais funcionalidades)
- ✅ Botão de pagar só aparece para parcelas não pagas

## Benefícios
- **Consistência**: Botão de editar sempre disponível
- **Usabilidade**: Usuário pode editar qualquer parcela a qualquer momento
- **Flexibilidade**: Acesso fácil às funcionalidades de edição