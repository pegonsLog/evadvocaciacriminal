# Documento de Design - Relatório de Consulta Geral

## Visão Geral

O componente de Relatório de Consulta Geral será uma interface abrangente que consolidará todos os dados financeiros e contratuais do sistema EV Advocacia Criminal. O design seguirá a arquitetura Angular 17 standalone existente, integrando-se perfeitamente com os serviços Firebase já implementados.

## Arquitetura

### Estrutura de Componentes

```
src/app/components/relatorio-consulta-geral/
├── relatorio-consulta-geral.component.ts     # Componente principal
├── relatorio-consulta-geral.component.html   # Template principal
├── relatorio-consulta-geral.component.scss   # Estilos específicos
├── filtros/
│   ├── filtros-relatorio.component.ts        # Componente de filtros
│   ├── filtros-relatorio.component.html
│   └── filtros-relatorio.component.scss
├── graficos/
│   ├── grafico-receita.component.ts          # Gráfico de receita mensal
│   ├── grafico-status.component.ts           # Gráfico de status de pagamentos
│   ├── grafico-inadimplencia.component.ts    # Gráfico de inadimplência
│   └── grafico-evolucao-cliente.component.ts # Gráfico específico do cliente
├── metricas/
│   ├── cards-metricas.component.ts           # Cards com métricas principais
│   ├── cards-metricas.component.html
│   └── cards-metricas.component.scss
└── exportacao/
    ├── exportacao-relatorio.component.ts     # Componente de exportação
    ├── exportacao-relatorio.component.html
    └── exportacao-relatorio.component.scss
```

### Serviços

```
src/app/services/
├── relatorio.service.ts                      # Serviço principal do relatório
├── exportacao.service.ts                     # Serviço de exportação
└── metricas.service.ts                       # Serviço de cálculo de métricas
```

### Modelos de Dados

```
src/app/models/
├── relatorio.model.ts                        # Interfaces do relatório
└── metricas.model.ts                         # Interfaces de métricas
```

## Componentes e Interfaces

### 1. Componente Principal (RelatorioConsultaGeralComponent)

**Responsabilidades:**

- Orquestrar a exibição dos dados consolidados
- Gerenciar estado dos filtros aplicados
- Controlar permissões baseadas no role do usuário
- Coordenar a comunicação entre subcomponentes

**Propriedades principais:**

```typescript
export class RelatorioConsultaGeralComponent {
  usuarioAtual: User | null = null;
  dadosConsolidados: DadosRelatorio | null = null;
  filtrosAtivos: FiltrosRelatorio = {};
  carregando: boolean = false;
  erro: string | null = null;
}
```

### 2. Componente de Filtros (FiltrosRelatorioComponent)

**Funcionalidades:**

- Filtro por período (data início/fim)
- Filtro por status de pagamento
- Filtro por cliente (apenas para admin)
- Filtro por valor mínimo/máximo
- Botões de períodos pré-definidos (último mês, trimestre, ano)

### 3. Componentes de Gráficos

**GraficoReceitaComponent:**

- Gráfico de barras/linha mostrando receita mensal
- Comparação entre receita prevista vs realizada
- Tendência de crescimento

**GraficoStatusComponent:**

- Gráfico de pizza com distribuição de status
- Percentuais de pagamentos em dia, atrasados e pendentes

**GraficoInadimplenciaComponent:**

- Gráfico temporal da taxa de inadimplência
- Identificação de períodos críticos

### 4. Componente de Métricas (CardsMetricasComponent)

**Cards principais:**

- Total de receita recebida
- Valor pendente
- Taxa de inadimplência
- Número de contratos ativos
- Ticket médio por cliente
- Tempo médio de pagamento

## Modelos de Dados

### Interface DadosRelatorio

```typescript
export interface DadosRelatorio {
  metricas: MetricasGerais;
  dadosGraficos: DadosGraficos;
  listaContratos: ContratoResumo[];
  alertas: AlertaInadimplencia[];
}

export interface MetricasGerais {
  totalRecebido: number;
  totalPendente: number;
  totalAtrasado: number;
  taxaInadimplencia: number;
  numeroContratosAtivos: number;
  ticketMedio: number;
  tempoMedioPagamento: number;
}

export interface FiltrosRelatorio {
  dataInicio?: Date;
  dataFim?: Date;
  statusPagamento?: StatusPagamento[];
  clienteId?: string;
  valorMinimo?: number;
  valorMaximo?: number;
}

export interface ContratoResumo {
  clienteId: string;
  clienteNome: string;
  numeroContrato: string;
  valorTotal: number;
  valorPago: number;
  saldoDevedor: number;
  statusGeral: "em_dia" | "atrasado" | "quitado";
  proximoVencimento?: Date;
  diasAtraso: number;
}
```

### Interface DadosGraficos

```typescript
export interface DadosGraficos {
  receitaMensal: DadosMensais[];
  distribuicaoStatus: DistribuicaoStatus;
  evolucaoInadimplencia: DadosMensais[];
  topClientesReceita: TopCliente[];
}

export interface DadosMensais {
  mes: string;
  ano: number;
  valor: number;
  valorPrevisto?: number;
}

export interface DistribuicaoStatus {
  pagos: number;
  pendentes: number;
  atrasados: number;
}
```

## Lógica de Negócio

### RelatorioService

**Métodos principais:**

```typescript
export class RelatorioService {
  // Obtém dados consolidados baseados nos filtros
  obterDadosRelatorio(filtros: FiltrosRelatorio, usuarioId?: string): Observable<DadosRelatorio>;

  // Calcula métricas gerais
  calcularMetricas(contratos: Cliente[], parcelas: Parcela[]): MetricasGerais;

  // Prepara dados para gráficos
  prepararDadosGraficos(contratos: Cliente[], parcelas: Parcela[]): DadosGraficos;

  // Identifica alertas de inadimplência
  identificarAlertas(parcelas: Parcela[]): AlertaInadimplencia[];
}
```

### ExportacaoService

**Funcionalidades:**

```typescript
export class ExportacaoService {
  // Exporta relatório em PDF
  exportarPDF(dados: DadosRelatorio, filtros: FiltrosRelatorio): Promise<void>;

  // Exporta dados em Excel
  exportarExcel(dados: DadosRelatorio, filtros: FiltrosRelatorio): Promise<void>;

  // Gera gráficos para exportação
  gerarGraficosParaExportacao(dados: DadosGraficos): Promise<string[]>;
}
```

## Controle de Acesso

### Permissões por Role

**Administrador (ADMIN):**

- Visualiza todos os contratos e clientes
- Acesso a todas as métricas consolidadas
- Pode exportar relatórios completos
- Visualiza alertas de inadimplência de todos os clientes

**Usuário Comum (COMUM):**

- Visualiza apenas seus próprios contratos (baseado no email/ID)
- Métricas limitadas aos seus dados
- Exportação restrita aos seus contratos
- Alertas apenas dos seus pagamentos

### Implementação de Segurança

```typescript
// No componente principal
ngOnInit() {
  this.authService.currentUser$.subscribe(user => {
    this.usuarioAtual = user;
    if (user?.role === UserRole.ADMIN) {
      this.carregarDadosAdmin();
    } else {
      this.carregarDadosCliente(user?.uid);
    }
  });
}
```

## Interface de Usuário

### Layout Responsivo

**Desktop (≥992px):**

- Layout em grid 3x2 para cards de métricas
- Gráficos lado a lado em duas colunas
- Filtros em sidebar lateral

**Tablet (768px-991px):**

- Cards de métricas em grid 2x3
- Gráficos empilhados verticalmente
- Filtros em modal/drawer

**Mobile (<768px):**

- Cards de métricas em coluna única
- Gráficos adaptados para tela pequena
- Filtros em modal fullscreen

### Componentes Bootstrap

**Utilizados:**

- `card` para métricas e gráficos
- `btn-group` para filtros de período
- `form-control` para inputs de filtro
- `modal` para exportação e filtros mobile
- `spinner` para estados de carregamento
- `alert` para mensagens de erro/sucesso

### Paleta de Cores

**Métricas:**

- Verde (#28a745): Valores positivos, pagamentos em dia
- Amarelo (#ffc107): Alertas, pagamentos próximos ao vencimento
- Vermelho (#dc3545): Valores em atraso, inadimplência
- Azul (#007bff): Valores neutros, totais

## Tratamento de Erros

### Estratégias de Error Handling

**Erros de Conexão:**

- Retry automático com backoff exponencial
- Fallback para dados em cache quando disponível
- Mensagens informativas para o usuário

**Erros de Permissão:**

- Redirecionamento para página apropriada
- Mensagens claras sobre limitações de acesso

**Erros de Dados:**

- Validação de integridade dos dados
- Tratamento de dados inconsistentes
- Logs detalhados para debugging

## Estratégia de Testes

### Testes Unitários

- Serviços de cálculo de métricas
- Lógica de filtros e transformação de dados
- Componentes de gráficos isoladamente

### Testes de Integração

- Fluxo completo de carregamento de dados
- Interação entre filtros e atualização de gráficos
- Funcionalidade de exportação

### Testes de Permissão

- Verificação de dados exibidos por role
- Restrições de acesso a funcionalidades
- Comportamento com usuários não autenticados

## Performance e Otimização

### Estratégias de Performance

**Lazy Loading:**

- Carregamento sob demanda dos gráficos
- Paginação para listas grandes de contratos

**Caching:**

- Cache de dados calculados por período
- Invalidação inteligente baseada em mudanças

**Otimização de Queries:**

- Agregação de dados no frontend para reduzir calls
- Uso de índices apropriados no Firestore

**Virtual Scrolling:**

- Para listas extensas de contratos
- Renderização apenas dos itens visíveis
