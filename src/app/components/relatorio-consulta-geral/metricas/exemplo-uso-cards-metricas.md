# Exemplo de Uso - CardsMetricasComponent

## Importação e Uso Básico

```typescript
import { CardsMetricasComponent } from "./metricas/cards-metricas.component";

@Component({
  selector: "app-relatorio-consulta-geral",
  standalone: true,
  imports: [CardsMetricasComponent],
  template: ` <app-cards-metricas [metricas]="dadosRelatorio?.metricas" [metricasAnteriores]="metricasAnteriores" [carregando]="carregandoDados" [animarEntrada]="true" [animarTransicoes]="true"> </app-cards-metricas> `,
})
export class RelatorioConsultaGeralComponent {
  dadosRelatorio: DadosRelatorio | null = null;
  metricasAnteriores: MetricasGerais | null = null;
  carregandoDados = false;
}
```

## Propriedades de Entrada

- **metricas**: `MetricasGerais | null` - Dados atuais das métricas
- **metricasAnteriores**: `MetricasGerais | null` - Dados do período anterior para comparação
- **carregando**: `boolean` - Estado de carregamento
- **animarEntrada**: `boolean` - Habilita animação de entrada dos cards (padrão: true)
- **animarTransicoes**: `boolean` - Habilita animações de transição entre valores (padrão: true)

## Funcionalidades Implementadas

### 1. Cards de Métricas Bootstrap

- Cards responsivos com design moderno
- Formatação automática de valores monetários e percentuais
- Indicadores visuais de tendências (setas e cores)
- Ícones temáticos para cada métrica

### 2. Animações e Transições

- **Animação de entrada escalonada**: Cards aparecem sequencialmente
- **Contagem animada**: Valores numéricos crescem de 0 até o valor final
- **Transições suaves**: Mudanças entre estados são animadas
- **Efeitos de destaque**: Cards pulsam quando há mudanças significativas
- **Barras de progresso animadas**: Para métricas percentuais

### 3. Métricas Exibidas

- Total Recebido (moeda, verde)
- Total Pendente (moeda, amarelo)
- Total em Atraso (moeda, vermelho)
- Taxa de Inadimplência (percentual, azul)
- Contratos Ativos (número, azul primário)
- Ticket Médio (moeda, cinza)

### 4. Comparação com Período Anterior

- Variação absoluta e percentual
- Indicadores visuais de tendência
- Cores diferenciadas para crescimento/decrescimento

## Exemplo de Dados

```typescript
const metricasExemplo: MetricasGerais = {
  totalRecebido: 125000.5,
  totalPendente: 45000.0,
  totalAtrasado: 12500.75,
  taxaInadimplencia: 8.5,
  numeroContratosAtivos: 42,
  ticketMedio: 3500.25,
  tempoMedioPagamento: 15,
};

const metricasAnteriores: MetricasGerais = {
  totalRecebido: 118000.0,
  totalPendente: 48000.0,
  totalAtrasado: 15000.0,
  taxaInadimplencia: 10.2,
  numeroContratosAtivos: 38,
  ticketMedio: 3200.0,
  tempoMedioPagamento: 18,
};
```

## Personalização de Animações

O componente utiliza o `AnimacaoMetricasService` que oferece:

- Funções de easing personalizadas
- Controle de duração das animações
- Animações síncronas e assíncronas
- Efeitos de pulsação para destaques

## Responsividade

- **Desktop (≥992px)**: Grid 3x2 para os cards
- **Tablet (768px-991px)**: Grid 2x3 adaptativo
- **Mobile (<768px)**: Coluna única com cards otimizados

## Acessibilidade

- Suporte a `prefers-reduced-motion` para usuários sensíveis a animações
- Indicadores de carregamento com texto alternativo
- Cores com contraste adequado
- Navegação por teclado otimizada

## Integração com o Sistema

O componente se integra perfeitamente com:

- Serviços Firebase existentes
- Sistema de autenticação e permissões
- Outros componentes do relatório (filtros, gráficos)
- Tema Bootstrap customizado do projeto
