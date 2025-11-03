# Testes Unitários Implementados

## Resumo dos Testes

Os testes unitários foram implementados para cobrir as melhorias no sistema de cálculo de parcelas, conforme especificado nos requisitos.

### ParcelaService - Testes Implementados

#### 1. Cálculo de Valor Parcelado

- ✅ Teste de cálculo correto descontando entrada do valor total
- ✅ Teste de cálculo com entrada zero
- ✅ Verificação de que o valor da parcela é calculado como (valorTotal - valorEntrada) / numeroParcelas

#### 2. Geração de Datas com Meses de Diferentes Tamanhos

- ✅ Teste de ajuste para último dia do mês quando dia não existe (ex: 31/01 → 29/02 em ano bissexto)
- ✅ Teste de manutenção do mesmo dia quando possível
- ✅ Verificação de sequência correta de meses

#### 3. Validações de Entrada e Data

- ✅ Validação de entrada maior que valor total (deve lançar erro)
- ✅ Validação de data do primeiro vencimento no passado (deve lançar erro)
- ✅ Validação de número de parcelas inválido (zero ou negativo)
- ✅ Validação quando não há valor a ser parcelado (entrada = total)

#### 4. Compatibilidade com Dados Existentes

- ✅ Teste de uso do método legado quando dataPrimeiroVencimento não está presente
- ✅ Teste de uso do novo método quando dataPrimeiroVencimento está presente
- ✅ Verificação de que clientes antigos continuam funcionando

### ClienteFormComponent - Testes Implementados

#### 1. Cálculo de Valor das Parcelas

- ✅ Cálculo correto descontando entrada do valor total
- ✅ Cálculo com entrada zero
- ✅ Cálculo com valores decimais
- ✅ Recálculo automático quando valores mudam

#### 2. Validações do Formulário

- ✅ Validação de entrada não maior que total
- ✅ Validação de data do primeiro vencimento não no passado
- ✅ Validação de campos obrigatórios
- ✅ Validação de valores mínimos

#### 3. Formatação de Valores

- ✅ Formatação correta de valores monetários (1000 → "1.000,00")

#### 4. Detecção de Mudanças Relevantes

- ✅ Detecção de mudanças no valor total
- ✅ Detecção de mudanças na entrada
- ✅ Detecção de mudanças no número de parcelas
- ✅ Detecção de mudanças na data do primeiro vencimento
- ✅ Não detecção quando valores são iguais

## Cenários de Teste Cobertos

### Cenário 1: Cálculo Básico

- Valor total: R$ 1.000,00
- Entrada: R$ 200,00
- Parcelas: 4
- Resultado esperado: R$ 200,00 por parcela

### Cenário 2: Data com Dia 31

- Primeiro vencimento: 31/01/2024
- Segunda parcela: 29/02/2024 (ajuste para ano bissexto)
- Terceira parcela: 31/03/2024

### Cenário 3: Validações de Erro

- Entrada maior que total → Erro
- Data no passado → Erro
- Parcelas zero → Erro
- Entrada igual ao total → Erro

## Arquivos de Teste Criados

1. `src/app/services/parcela.service.spec.ts` - Testes completos do ParcelaService
2. `src/app/components/clientes/cliente-form/cliente-form.component.spec.ts` - Testes completos do ClienteFormComponent
3. `src/app/services/parcela.service.simple.spec.ts` - Testes simplificados para validações
4. `src/app/components/clientes/cliente-form/cliente-form.simple.spec.ts` - Testes simplificados do formulário

## Requisitos Atendidos

- ✅ **Requisito 1.1**: Cálculo correto do valor parcelado
- ✅ **Requisito 2.2**: Uso da data do primeiro vencimento
- ✅ **Requisito 3.1**: Consistência do dia de vencimento

## Como Executar os Testes

```bash
# Executar todos os testes
npm test

# Executar testes específicos
ng test --include="**/parcela.service.spec.ts"
ng test --include="**/cliente-form.component.spec.ts"
```

## Observações

Os testes foram implementados seguindo as melhores práticas:

- Uso de mocks para dependências externas (Firestore)
- Testes isolados e independentes
- Cobertura de casos de sucesso e erro
- Validação de comportamentos específicos dos requisitos
- Testes de compatibilidade com dados existentes
