# Correção da Moeda para Real Brasileiro

## Mudanças Realizadas

### 1. Configuração de Locale
- **Arquivo**: `src/app/app.config.ts`
- **Mudança**: Configurado o locale para português brasileiro (pt-BR)
- **Detalhes**: Importado `localePt` e registrado com `registerLocaleData(localePt)`

### 2. Pipes Currency Atualizados
Todos os pipes `currency` foram atualizados para usar explicitamente o Real Brasileiro:

**Formato anterior**: `{{ valor | currency }}`
**Formato novo**: `{{ valor | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}`

### Arquivos Modificados:
- `src/app/components/clientes/cliente-detalhes/cliente-detalhes.component.html`
- `src/app/components/clientes/cliente-lista/cliente-lista.component.html`
- `src/app/components/controle-pagamentos/controle-pagamentos.component.html`
- `src/app/components/parcelas/parcela-lista/parcela-lista.component.html`
- `src/app/components/pagamentos/pagamento-lista/pagamento-lista.component.html`
- `src/app/components/home/home.component.html`

### 3. Parâmetros do Pipe Currency
- **BRL**: Código da moeda brasileira
- **symbol**: Exibe o símbolo R$
- **1.2-2**: Formato numérico (mínimo 1 dígito antes da vírgula, 2 dígitos após)
- **pt-BR**: Locale brasileiro para formatação

## Resultado
Agora todos os valores monetários no app são exibidos em Real Brasileiro (R$) com formatação brasileira.