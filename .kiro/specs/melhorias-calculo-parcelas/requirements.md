# Documento de Requisitos

## Introdução

Este documento especifica as melhorias necessárias no sistema de cálculo e geração de parcelas do EV Advocacia Criminal. As modificações visam corrigir a lógica de cálculo das parcelas considerando o valor de entrada, implementar controle de data do primeiro vencimento e padronizar o dia de vencimento baseado na primeira parcela.

## Glossário

- **Sistema_Parcelas**: Módulo responsável pelo cálculo e geração das parcelas de pagamento
- **Valor_Contrato**: Valor total do contrato incluindo entrada
- **Valor_Entrada**: Valor pago antecipadamente pelo cliente
- **Valor_Parcelado**: Valor do contrato menos o valor da entrada que será dividido em parcelas
- **Data_Primeiro_Vencimento**: Data específica definida para o vencimento da primeira parcela
- **Dia_Vencimento**: Dia do mês extraído da data do primeiro vencimento para aplicar às demais parcelas

## Requisitos

### Requisito 1

**User Story:** Como um usuário do sistema, eu quero que o valor das parcelas seja calculado corretamente descontando a entrada do valor total, para que o cliente pague apenas o valor restante parcelado.

#### Critérios de Aceitação

1. WHEN o usuário inserir valor total e valor de entrada, THE Sistema_Parcelas SHALL calcular o valor parcelado subtraindo a entrada do valor total
2. WHEN o usuário inserir número de parcelas, THE Sistema_Parcelas SHALL dividir o valor parcelado pelo número de parcelas para obter o valor individual
3. THE Sistema_Parcelas SHALL exibir o valor da parcela calculado automaticamente no formulário
4. THE Sistema_Parcelas SHALL validar que o valor de entrada não seja maior que o valor total do contrato

### Requisito 2

**User Story:** Como um usuário do sistema, eu quero definir a data específica do primeiro vencimento, para que as parcelas sejam geradas com base nessa data inicial ao invés da data atual.

#### Critérios de Aceitação

1. THE Sistema_Parcelas SHALL incluir um campo "Data do Primeiro Vencimento" no formulário de cliente
2. WHEN o usuário definir a data do primeiro vencimento, THE Sistema_Parcelas SHALL usar essa data como base para gerar todas as parcelas
3. THE Sistema_Parcelas SHALL calcular as datas das parcelas subsequentes adicionando meses à data do primeiro vencimento
4. THE Sistema_Parcelas SHALL validar que a data do primeiro vencimento não seja anterior à data atual

### Requisito 3

**User Story:** Como um usuário do sistema, eu quero que o dia de vencimento das parcelas seja baseado no dia definido na primeira parcela, para que todas as parcelas mantenham consistência na data de vencimento.

#### Critérios de Aceitação

1. THE Sistema_Parcelas SHALL extrair o dia da data do primeiro vencimento para usar como padrão
2. THE Sistema_Parcelas SHALL aplicar o mesmo dia de vencimento para todas as parcelas subsequentes
3. WHEN o dia não existir no mês (exemplo: dia 31 em fevereiro), THE Sistema_Parcelas SHALL ajustar para o último dia válido do mês
4. THE Sistema_Parcelas SHALL remover o campo "Dia do Vencimento" do formulário pois será calculado automaticamente
