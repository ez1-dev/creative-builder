# Múltiplas séries nos gráficos do BI Comercial

Hoje cada gráfico do `/bi/comercial` plota uma única métrica fixa. Vamos permitir que o usuário escolha N séries (incluindo métricas calculadas) e exiba todas no mesmo gráfico, com persistência por usuário (já temos `dashboards`/`dashboard_widgets`).

## 1. Métricas disponíveis

Criar um **catálogo de métricas** em `src/lib/bi/comercialMetrics.ts` agrupando o que já vem dos endpoints, mais um tipo "custom":

| Grupo | Métricas | Origem |
|---|---|---|
| Monetárias | Faturamento, Líquido, Impostos, Devolução, Meta | linha mensal |
| Contagens | Nº Vendas, Nº Clientes, Quantidade | linha mensal |
| Médias | Ticket Médio, Preço Médio | linha mensal |
| Derivadas (built-in) | % Devolução, % Imposto, Diferença vs Meta | calculadas no front |
| **Custom** | Definidas pelo usuário | fórmula salva no widget |

Cada métrica tem: `key`, `label`, `format` (`currency` \| `number` \| `percent`), `axis` (`primary` \| `secondary`), `defaultColor`, `compatibleWith` (lista de tipos de widget onde faz sentido — `serie-mensal`, `mix`, `revendas`, etc.).

**Métricas custom** = `{ id, label, formula, format }` com fórmula tipo `faturamento - devolucao` ou `devolucao / faturamento * 100`. Avaliada por um pequeno parser seguro (whitelist de identificadores + operadores `+ - * / ( )`), sem `eval`.

## 2. Escopo da multi-série por tipo de widget

- **`serie-mensal`** — escopo total. Plota N séries sobre `anomes_emissao`. Suporta combo/linha/área/barras empilhadas/tabela. Eixo Y duplo automático quando há mistura de formatos (ex.: moeda + contagem).
- **`mix`, `revendas`, `obras`, `estados`** — endpoints atuais devolvem apenas valor único por dimensão. Para esses widgets, "múltiplas séries" passa a significar **escolher qual métrica é usada como valor do ranking/donut** (substituindo o fixo `faturamento`). Stacked-bar com múltiplas métricas fica **fora do escopo** desta entrega (requer mudança de endpoint).
- **Widgets da Biblioteca BI** adicionados via "Adicionar widget" — passam a aceitar `mapping.series: MetricRef[]` quando o componente declarar suporte (combo, line, area, bar, stacked-bar). Componentes que só aceitam 1 série continuam mono.

## 3. Modelo no widget

Estender o `config` JSONB de `dashboard_widgets` (sem migration — campo já é livre):

```ts
type MetricRef = {
  key: string;              // chave do catálogo ou id de métrica custom
  label?: string;           // override do nome na legenda
  color?: string;           // hex/hsl token
  chartType?: 'bar'|'line'|'area';  // por série no combo
  axis?: 'primary'|'secondary';
};

interface ComercialWidgetConfig {
  // já existentes: customTitle, variant, componentId, mapping, options, hidden, kpiKey, layout
  series?: MetricRef[];     // NOVO — multi-série
  customMetrics?: { id:string; label:string; formula:string; format:'currency'|'number'|'percent' }[];
}
```

Custom metrics também podem viver **globais por usuário** numa nova tabela `bi_user_custom_metrics(user_id, page_key, id, label, formula, format)` (RLS por `auth.uid()`), para reuso entre widgets sem duplicar. Hook `useCustomMetrics(pageKey)`.

## 4. UI de configuração

### 4a. Diálogo "Configurar widget" (`ConfigureBiWidgetDialog`)
Nova aba **Séries**:
- Lista ordenável (drag) das séries ativas, cada uma com: métrica (combobox do catálogo + custom), rótulo, cor (color picker), tipo (linha/barra/área quando combo), eixo (Y1/Y2).
- Botão "+ Adicionar série" abre o **MetricPicker** (busca + grupos do catálogo + "Criar métrica calculada…").
- Botão "Criar métrica calculada" abre **FormulaBuilder** (input com autocomplete dos identificadores, validação ao vivo, formato).

### 4b. Toggle inline (chips no gráfico)
Acima de cada gráfico de série com 2+ séries possíveis, renderizar `SeriesChips` com chips clicáveis (mostra/oculta série). Estado **visual** apenas (não persiste — para esconder/persistir use o diálogo).

### 4c. Custom metrics globais
Nova rota leve `Gerenciar métricas` no header do builder (modal) listando/CRUD das métricas custom do usuário para a página.

## 5. Renderização

- Novo componente `MultiSeriesChartCard` (wrapper sobre Recharts ComposedChart) que aceita `series: MetricRef[]` + `data` e cuida de eixos duplos, cores e tooltips formatados por métrica.
- `renderSerieMensal` passa a:
  1. Resolver cada `MetricRef` em uma série de pontos a partir de `dadosCombo` (rows mensais) — métricas custom são calculadas por linha pelo evaluator.
  2. Se `series.length <= 1` e nenhuma custom → caminho atual (mantém combo Faturamento × Meta como default).
  3. Caso contrário → `MultiSeriesChartCard`.
- `renderSerieGeneric` (mix/revendas/obras): se `series[0]` definido, usar `series[0].key` para puxar a métrica dos dados do ranking (quando disponível no payload do endpoint) — fallback ao comportamento atual.

## 6. Compatibilidade com Biblioteca BI

- Estender `ComponentDef` (em `componentRegistry.tsx`) com `supportsMultiSeries?: boolean`.
- `AddBiWidgetDialog` e `ConfigureBiWidgetDialog`: quando o componente selecionado tiver `supportsMultiSeries`, mostrar a aba Séries; senão, apenas mapping single.
- O `render` dos componentes de gráfico da Biblioteca recebe `mapping.series` e, quando presente, ignora `mapping.value`.

## 7. Out of scope

- Alterar endpoints FastAPI (sem mudar `comercialApi.ts`). Multi-série em ranking/mix fica limitado a "trocar a métrica de medida".
- Stacked-bar com breakdown por dimensão (precisa pivot no backend).
- KPIs do topo, drill lists, tabelas — nenhuma mudança aqui.

## Detalhes técnicos

**Novos arquivos**
- `src/lib/bi/comercialMetrics.ts` — catálogo + tipos `MetricRef`.
- `src/lib/bi/formulaEvaluator.ts` — parser seguro (shunting-yard ou `expr-eval` simples manual).
- `src/hooks/useCustomMetrics.ts` — CRUD em `bi_user_custom_metrics`.
- `src/components/bi/runtime/MetricPicker.tsx` — combobox agrupado.
- `src/components/bi/runtime/SeriesEditor.tsx` — lista ordenável (usar `@dnd-kit` já presente).
- `src/components/bi/runtime/FormulaBuilder.tsx` — input + validador.
- `src/components/bi/runtime/SeriesChips.tsx` — toggle inline.
- `src/components/bi/charts/MultiSeriesChartCard.tsx` — ComposedChart com eixo duplo.

**Arquivos editados**
- `src/components/bi/runtime/ConfigureBiWidgetDialog.tsx` — nova aba Séries.
- `src/components/bi/runtime/AddBiWidgetDialog.tsx` — séries iniciais para combo/line/area.
- `src/lib/bi/componentRegistry.tsx` — flag `supportsMultiSeries` e pass-through de `mapping.series` nos componentes elegíveis.
- `src/pages/bi/ComercialPage.tsx` — usar `MultiSeriesChartCard` quando `series.length >= 1` em `serie-mensal`; aplicar `series[0].key` em ranking/donut; renderizar `SeriesChips`.

**Migration SQL** (única necessária)
```sql
CREATE TABLE public.bi_user_custom_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_key text NOT NULL,
  metric_id text NOT NULL,
  label text NOT NULL,
  formula text NOT NULL,
  format text NOT NULL DEFAULT 'number',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key, metric_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_user_custom_metrics TO authenticated;
GRANT ALL ON public.bi_user_custom_metrics TO service_role;
ALTER TABLE public.bi_user_custom_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metrics" ON public.bi_user_custom_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```
