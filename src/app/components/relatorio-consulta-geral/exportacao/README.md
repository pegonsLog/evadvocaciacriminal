# Componente de Exportação de Relatório

## Visão Geral

O `ExportacaoRelatorioComponent` permite aos usuários exportar dados do relatório de consulta geral em formatos PDF e Excel com opções de configuração personalizáveis.

## Funcionalidades

### Formatos Suportados

- **PDF**: Usando jsPDF para geração de documentos PDF
- **Excel**: Usando SheetJS (xlsx) para planilhas Excel

### Opções de Configuração

- **Incluir Métricas**: Métricas gerais consolidadas
- **Incluir Gráficos**: Dados dos gráficos (receita mensal, status, etc.)
- **Incluir Lista de Contratos**: Detalhes de todos os contratos
- **Incluir Alertas**: Alertas de inadimplência
- **Nome Personalizado**: Nome customizado para o arquivo

### Recursos Técnicos

- **Importação Dinâmica**: Bibliotecas carregadas sob demanda (lazy loading)
- **Preview de Dados**: Visualização prévia do que será exportado
- **Validação**: Verificação de configurações antes da exportação
- **Tratamento de Erros**: Mensagens de erro amigáveis

## Como Usar

### No Template

```html
<app-exportacao-relatorio [dadosRelatorio]="dadosConsolidados" [filtrosAplicados]="filtrosAtivos" (exportacaoConcluida)="onExportacaoConcluida()"> </app-exportacao-relatorio>
```

### Propriedades de Entrada

- `dadosRelatorio`: Dados consolidados do relatório
- `filtrosAplicados`: Filtros atualmente aplicados

### Eventos de Saída

- `exportacaoConcluida`: Emitido quando a exportação é concluída com sucesso

## Dependências

### Bibliotecas Necessárias

```bash
npm install jspdf html2canvas xlsx
npm install --save-dev @types/html2canvas
```

### Importações Automáticas

As bibliotecas são importadas dinamicamente quando necessário:

- `jspdf`: Para geração de PDFs
- `xlsx`: Para geração de planilhas Excel
- `html2canvas`: Para captura de gráficos (funcionalidade futura)

## Estrutura dos Arquivos Exportados

### PDF

- Cabeçalho com título e data
- Informações dos filtros aplicados
- Métricas principais em formato tabular
- Lista de contratos (limitada a 20 por página)
- Alertas de inadimplência

### Excel

- **Aba "Métricas Gerais"**: Métricas consolidadas
- **Aba "Contratos"**: Lista completa de contratos
- **Aba "Receita Mensal"**: Dados de receita por mês
- **Aba "Alertas"**: Alertas de inadimplência
- **Aba "Informações"**: Metadados do relatório

## Configuração Padrão

```typescript
configuracao: ConfiguracaoExportacao = {
  formato: "pdf",
  incluirGraficos: true,
  incluirMetricas: true,
  incluirListaContratos: true,
  incluirAlertas: true,
  nomeArquivo: "relatorio-consulta-geral-YYYY-MM-DD",
};
```

## Tratamento de Erros

O componente trata os seguintes cenários de erro:

- Bibliotecas não instaladas
- Dados indisponíveis
- Falhas na geração de arquivos
- Configurações inválidas

## Performance

- **Lazy Loading**: Bibliotecas carregadas apenas quando necessário
- **Chunks Separados**: Cada biblioteca é um chunk separado no build
- **Importação Assíncrona**: Não bloqueia o carregamento inicial da aplicação

## Limitações Atuais

- Gráficos não são incluídos nos PDFs (implementação futura)
- Limite de 20 contratos por página no PDF
- Limite de 10 alertas no PDF

## Extensibilidade

O componente foi projetado para ser facilmente extensível:

- Novos formatos podem ser adicionados
- Configurações adicionais podem ser incluídas
- Templates de exportação podem ser customizados
