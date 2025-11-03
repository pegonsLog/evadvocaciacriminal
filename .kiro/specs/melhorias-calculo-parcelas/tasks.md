# Plano de Implementação

- [x] 1. Atualizar modelo de dados do Cliente

  - Adicionar campo dataPrimeiroVencimento na interface Cliente
  - Remover campo diaVencimento da interface Cliente
  - _Requisitos: 2.1, 3.4_

-

- [x] 2. Modificar formulário de cliente

- [x] 2.1 Atualizar template do formulário

  - Adicionar campo "Data do Primeiro Vencimento" no HTML
  - Remover campo "Dia do Vencimento" do HTML
  - Aplicar validações e máscaras apropriadas
  - _Requisitos: 2.1, 3.4_

- [x] 2.2 Atualizar lógica do componente ClienteFormComponent

  - Adicionar dataPrimeiroVencimento no FormGroup com validação obrigatória
  - Remover diaVencimento do FormGroup
  - Implementar método calcularValorParcela() que desconta entrada do valor total
  - Adicionar listeners para recalcular automaticamente quando valores mudarem
  - _Requisitos: 1.1, 1.2, 2.2, 2.4_

- [x] 3. Implementar nova lógica de cálculo de parcelas

- [x] 3.1 Atualizar ParcelaService

Eu vi - Criar método gerarParcelasComDataBase() que usa data do primeiro vencimento

- Implementar lógica para extrair dia de vencimento da primeira parcela
- Adicionar tratamento para meses com diferentes números de dias
- Manter método existente para compatibilidade com dados antigos
- _Requisitos: 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 3.2 Atualizar validações de negócio

  - Validar que valor de entrada não seja maior que valor total
  - Validar que data do primeiro vencimento não seja anterior à data atual
  - Implementar cálculo correto do valor parcelado (total - entrada)
  - _Requisitos: 1.4, 2.4, 1.1_

- [x] 4. Integrar mudanças no fluxo de cadastro

- [x] 4.1 Atualizar método de salvamento de cliente

  - Modificar lógica para usar nova estrutura de dados
  - Garantir que parcelas sejam geradas com nova lógica de cálculo
  - Manter compatibilidade com clientes existentes
  - _Requisitos: 1.1, 2.2, 3.1_

- [x] 4.2 Atualizar método de edição de cliente

  - Permitir modificação da data do primeiro vencimento
  - Recalcular parcelas quando dados relevantes forem alterados
  - Preservar histórico de pagamentos já realizados
  - _Requisitos: 2.2, 3.1_

- [x] 5. Implementar testes unitários

  - Testar cálculo de valor parcelado com diferentes cenários
  - Testar geração de datas com meses de diferentes tamanhos
  - Testar validações de entrada e data
  - Testar compatibilidade com dados existentes
  - _Requisitos: 1.1, 2.2, 3.1_

- [x] 6. Validar e testar integração completa

- [x] 6.1 Testar fluxo completo de cadastro

  - Verificar cálculo correto das parcelas no formulário
  - Confirmar geração correta das datas de vencimento
  - Validar persistência no Firestore
  - _Requisitos: 1.1, 1.2, 2.2, 3.1_

- [x] 6.2 Testar compatibilidade com dados existentes

  - Verificar que clientes antigos continuam funcionando

  - Testar migração gradual para nova estrutura
  - Confirmar que não há quebras no sistema atual
  - _Requisitos: Todos os requisitos_
