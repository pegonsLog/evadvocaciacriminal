# Dependências Necessárias para o Relatório de Consulta Geral

Para que o sistema de relatórios funcione completamente, é necessário instalar as seguintes dependências:

## Bibliotecas de Exportação

### Para exportação em PDF

```bash
npm install jspdf
npm install @types/jspdf --save-dev
```

### Para exportação em Excel

```bash
npm install xlsx
npm install @types/xlsx --save-dev
```

### Para captura de gráficos como imagem

```bash
npm install html2canvas
npm install @types/html2canvas --save-dev
```

## Instalação Completa

Execute o comando abaixo para instalar todas as dependências de uma vez:

```bash
npm install jspdf xlsx html2canvas
npm install @types/jspdf @types/xlsx @types/html2canvas --save-dev
```

## Funcionalidades Disponíveis

### Sem as bibliotecas instaladas:

- ✅ Visualização de relatórios na interface
- ✅ Cálculo de métricas
- ✅ Filtros e consultas
- ✅ Exportação CSV (nativa do browser)

### Com as bibliotecas instaladas:

- ✅ Todas as funcionalidades acima
- ✅ Exportação em PDF com formatação
- ✅ Exportação em Excel com múltiplas abas
- ✅ Captura de gráficos como imagens
- ✅ Relatórios completos com gráficos inclusos

## Notas Técnicas

- As importações são feitas dinamicamente para evitar erros quando as bibliotecas não estão instaladas
- O sistema mostrará mensagens de erro apropriadas se tentar usar funcionalidades sem as dependências
- Todas as exportações incluem timestamp e informações dos filtros aplicados
