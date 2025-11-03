# Documento de Design

## Visão Geral

Este documento detalha o design técnico para implementar as melhorias no sistema de cálculo de parcelas do EV Advocacia Criminal. As modificações incluem correção da lógica de cálculo considerando entrada, implementação de controle de data do primeiro vencimento e padronização do dia de vencimento.

## Arquitetura

### Componentes Afetados

- **ClienteFormComponent**: Formulário de cadastro/edição de clientes
- **ParcelaService**: Serviço responsável pela lógica de cálculo e geração de parcelas
- **Cliente Model**: Interface do modelo de dados do cliente

### Fluxo de Dados

1. Usuário preenche valor total, entrada e data do primeiro vencimento
2. Sistema calcula valor parcelado (total - entrada)
3. Sistema calcula valor individual das parcelas
4. Sistema gera parcelas com datas baseadas na data do primeiro vencimento
5. Sistema mantém consistência do dia de vencimento em todas as parcelas

## Componentes e Interfaces

### ClienteFormComponent

#### Modificações no Template

- Adicionar campo "Data do Primeiro Vencimento" (dataPrimeiroVencimento)
- Remover campo "Dia do Vencimento" (será calculado automaticamente)
- Atualizar validações do formulário

#### Modificações no Component

```typescript
// Novos campos no FormGroup
dataPrimeiroVencimento: ['', Validators.required]

// Método para calcular valor das parcelas
calcularValorParcela(): void {
  const valorTotal = this.clienteForm.get('valorTotal')?.value || 0;
  const valorEntrada = this.clienteForm.get('valorEntrada')?.value || 0;
  const numeroParcelas = this.clienteForm.get('numeroParcelas')?.value || 1;

  const valorParcelado = valorTotal - valorEntrada;
  const valorParcela = valorParcelado / numeroParcelas;

  this.clienteForm.patchValue({ valorParcela });
}
```

### ParcelaService

#### Novo Método: gerarParcelasComDataBase

```typescript
gerarParcelasComDataBase(
  valorParcelado: number,
  numeroParcelas: number,
  dataPrimeiroVencimento: Date,
  clienteId: string
): Parcela[] {
  const parcelas: Parcela[] = [];
  const diaVencimento = dataPrimeiroVencimento.getDate();

  for (let i = 0; i < numeroParcelas; i++) {
    const dataVencimento = new Date(dataPrimeiroVencimento);
    dataVencimento.setMonth(dataVencimento.getMonth() + i);

    // Ajustar para último dia do mês se necessário
    if (dataVencimento.getDate() !== diaVencimento) {
      dataVencimento.setDate(0); // Último dia do mês anterior
    }

    parcelas.push({
      numero: i + 1,
      valor: valorParcelado / numeroParcelas,
      dataVencimento,
      status: 'pendente',
      clienteId
    });
  }

  return parcelas;
}
```

## Modelos de Dados

### Cliente Model - Atualizações

```typescript
export interface Cliente {
  // Campos existentes...
  dataPrimeiroVencimento?: Date; // Novo campo
  // Remover: diaVencimento (será calculado automaticamente)
}
```

### Parcela Model - Sem alterações

O modelo de parcela permanece inalterado, apenas a lógica de geração será modificada.

## Tratamento de Erros

### Validações do Formulário

- Valor de entrada não pode ser maior que valor total
- Data do primeiro vencimento não pode ser anterior à data atual
- Todos os campos obrigatórios devem ser preenchidos

### Tratamento de Datas

- Verificar se o dia existe no mês de destino
- Ajustar para último dia válido quando necessário
- Manter consistência temporal nas parcelas

## Estratégia de Testes

### Testes Unitários

- Validar cálculo correto do valor parcelado
- Testar geração de datas com diferentes cenários
- Verificar tratamento de meses com diferentes números de dias
- Validar comportamento com valores de entrada diversos

### Cenários de Teste

1. **Cálculo básico**: Valor total R$ 1000, entrada R$ 200, 4 parcelas = R$ 200 por parcela
2. **Data com dia 31**: Primeiro vencimento 31/01, segunda parcela deve ser 28/02 (ou 29 em ano bissexto)
3. **Entrada igual ao valor total**: Deve resultar em 0 parcelas ou erro de validação
4. **Data passada**: Deve exibir erro de validação

### Testes de Integração

- Verificar persistência correta no Firestore
- Testar fluxo completo de cadastro com novas regras
- Validar atualização de clientes existentes
