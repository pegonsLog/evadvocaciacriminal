# Plano de Implementação - Relatório de Consulta Geral

- [x] 1. Criar modelos de dados e interfaces

  - Implementar interfaces TypeScript para DadosRelatorio, MetricasGerais, FiltrosRelatorio e DadosGraficos
  - Definir enums para StatusPagamento e tipos de alertas
  - Criar interface ContratoResumo para dados consolidados
  - _Requisitos: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 2. Implementar serviços de negócio

- [x] 2.1 Criar RelatorioService com lógica de consolidação de dados

  - Implementar método obterDadosRelatorio() que agrega dados de clientes e parcelas
  - Criar método calcularMetricas() para métricas financeiras consolidadas
  - Implementar método prepararDadosGraficos() para transformar dados para visualização
  - _Requisitos: 1.1, 1.2, 2.1, 4.1_

- [x] 2.2 Implementar MetricasService para cálculos específicos

  - Criar métodos para calcular taxa de inadimplência
  - Implementar cálculo de ticket médio e tempo médio de pagamento
  - Desenvolver lógica de identificação de alertas de cobrança
  - _Requisitos: 1.3, 4.2, 4.4_

- [x] 2.3 Criar ExportacaoService para geração de relatórios

  - Implementar exportação em formato PDF usando bibliotecas apropriadas
  - Criar funcionalidade de exportação para Excel
  - Desenvolver geração de gráficos para documentos exportados
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Desenvolver componente principal

- [x] 3.1 Criar RelatorioConsultaGeralComponent base

  - Implementar estrutura do componente com injeção de dependências
  - Criar lógica de controle de permissões baseada no usuário atual
  - Implementar gerenciamento de estado de carregamento e erros
  - _Requisitos: 1.1, 2.1, 5.1_

- [x] 3.2 Implementar lógica de carregamento de dados

  - Criar métodos separados para carregamento de dados admin vs cliente
  - Implementar reatividade aos filtros aplicados
  - Desenvolver tratamento de erros e estados de loading
  - _Requisitos: 1.1, 2.1, 5.1, 5.2_

- [x] 3.3 Criar template HTML responsivo

  - Implementar layout em grid Bootstrap para diferentes tamanhos de tela
  - Criar estrutura para cards de métricas e área de gráficos
  - Implementar indicadores de carregamento e mensagens de erro
  - _Requisitos: 5.2, 5.3, 5.4_

- [x] 4. Implementar componente de filtros

- [x] 4.1 Criar FiltrosRelatorioComponent

  - Implementar formulário reativo com controles de data, status e cliente
  - Criar botões de períodos pré-definidos (mês, trimestre, ano)
  - Desenvolver lógica de validação de filtros
  - _Requisitos: 1.4, 1.5, 2.4_

- [x] 4.2 Implementar comunicação com componente pai

  - Criar EventEmitter para mudanças de filtros
  - Implementar debounce para evitar múltiplas requisições
  - Desenvolver persistência de filtros no sessionStorage
  - _Requisitos: 1.4, 1.5, 5.4_

- [x] 5. Desenvolver componentes de gráficos

- [x] 5.1 Criar GraficoReceitaComponent

  - Implementar gráfico de barras/linha para receita mensal usando Chart.js ou similar
  - Criar comparação entre receita prevista vs realizada
  - Implementar responsividade e interatividade do gráfico
  - _Requisitos: 1.2, 2.5, 5.2_

- [x] 5.2 Implementar GraficoStatusComponent

  - Criar gráfico de pizza para distribuição de status de pagamentos
  - Implementar legendas e tooltips informativos
  - Desenvolver animações e transições suaves
  - _Requisitos: 1.2, 2.5, 5.2_

- [x] 5.3 Criar GraficoInadimplenciaComponent

  - Implementar gráfico temporal da taxa de inadimplência
  - Criar marcadores para períodos críticos
  - Desenvolver zoom e navegação temporal
  - _Requisitos: 4.1, 4.3, 5.2_

- [x] 5.4 Implementar GraficoEvolucaoClienteComponent

  - Criar gráfico específico para evolução de pagamentos do cliente
  - Implementar visualização de histórico de pagamentos
  - Desenvolver projeções de pagamentos futuros
  - _Requisitos: 2.5, 5.2_

- [x] 6. Criar componente de métricas

- [x] 6.1 Implementar CardsMetricasComponent

  - Criar cards Bootstrap para exibição de métricas principais
  - Implementar formatação de valores monetários e percentuais
  - Desenvolver indicadores visuais de tendências (setas, cores)
  - _Requisitos: 1.3, 2.3, 4.2_

- [x] 6.2 Adicionar animações e transições

  - Implementar animações de contagem para valores numéricos
  - Criar transições suaves entre estados de dados
  - Desenvolver feedback visual para atualizações de métricas
  - _Requisitos: 5.2, 5.3_

- [x] 7. Implementar funcionalidade de exportação

- [x] 7.1 Criar ExportacaoRelatorioComponent

  - Implementar interface para seleção de formato de exportação
  - Criar modal com opções de configuração de relatório
  - Desenvolver preview dos dados a serem exportados
  - _Requisitos: 3.1, 3.2, 3.5_

- [x] 7.2 Integrar bibliotecas de exportação

  - Configurar jsPDF para geração de PDFs
  - Integrar SheetJS para exportação Excel
  - Implementar captura de gráficos como imagens
  - _Requisitos: 3.1, 3.2, 3.4_

- [x] 8. Implementar controle de acesso e segurança

- [x] 8.1 Adicionar guards de rota

  - Implementar proteção da rota com authGuard
  - Criar lógica de redirecionamento baseada em permissões
  - Desenvolver tratamento de acesso negado
  - _Requisitos: 1.1, 2.1_

- [x] 8.2 Implementar filtros de dados por usuário

  - Criar lógica para filtrar dados baseado no role do usuário
  - Implementar restrições de visualização para usuários comuns
  - Desenvolver mascaramento de dados sensíveis quando necessário
  - _Requisitos: 2.1, 2.2, 2.3, 2.4_

- [x] 9. Adicionar rota e navegação

- [x] 9.1 Configurar rota no app.routes.ts

  - Adicionar rota '/relatorio-consulta-geral' com guards apropriados
  - Configurar lazy loading se necessário
  - Implementar breadcrumbs e navegação
  - _Requisitos: 1.1, 2.1_

- [x] 9.2 Atualizar navegação principal

  - Adicionar link no menu principal para usuários autorizados
  - Implementar ícone e label apropriados
  - Criar indicador visual para nova funcionalidade
  - _Requisitos: 1.1, 2.1_

- [x] 10. Otimização e performance

- [x] 10.1 Implementar estratégias de cache

  - Criar cache de dados calculados com TTL apropriado
  - Implementar invalidação de cache baseada em mudanças de dados
  - Desenvolver fallback para dados offline
  - _Requisitos: 5.1, 5.3_

- [x] 10.2 Otimizar carregamento de dados

  - Implementar lazy loading para gráficos não visíveis
  - Criar paginação para listas extensas de contratos
  - Desenvolver virtual scrolling quando necessário
  - _Requisitos: 5.1, 5.3_

- [ ]\* 11. Testes unitários e de integração
- [ ]\* 11.1 Criar testes para serviços

  - Escrever testes unitários para RelatorioService
  - Criar testes para MetricasService e ExportacaoService
  - Implementar mocks para dependências Firebase
  - _Requisitos: 1.1, 2.1, 3.1, 4.1_

- [ ]\* 11.2 Testes de componentes

  - Criar testes para componente principal e subcomponentes
  - Implementar testes de interação entre filtros e gráficos
  - Desenvolver testes de permissões e controle de acesso
  - _Requisitos: 1.1, 2.1, 5.1_

- [ ]\* 12. Documentação e refinamentos
- [ ]\* 12.1 Criar documentação técnica

  - Documentar APIs dos serviços criados
  - Criar guia de uso para diferentes tipos de usuário
  - Implementar comentários JSDoc nos métodos principais
  - _Requisitos: Todos_

- [ ]\* 12.2 Refinamentos de UX
  - Implementar tooltips explicativos para métricas
  - Criar tour guiado para primeira utilização
  - Desenvolver mensagens de ajuda contextuais
  - _Requisitos: 5.2, 5.3_
