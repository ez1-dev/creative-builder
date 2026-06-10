## Problema
O bloco "FaturamentoRealizadoMetaCard — Card isolado Realizado / Meta / Diferença" do catálogo `/biblioteca-bi` está marcado como `nonApplicable` (rótulo "uso direto via import") e por isso não tem o botão **Aplicar**. Logo, não dá para inseri-lo em nenhuma página BI.

## Causa
- `src/pages/BiComponentsDemoPage.tsx` (linha ~383) usa `<DemoBlock ... nonApplicable>`, sem `applyId`.
- O componente não está registrado em `COMPONENT_REGISTRY` (`src/lib/bi/componentRegistry.tsx`), então `ApplyComponentDialog` não o conhece.

## Solução

### 1. Registrar no `COMPONENT_REGISTRY`
Novo item:
- `id: 'faturamento-realizado-meta-card'`
- `kind: 'kpi'`
- `label: 'Faturamento — Realizado / Meta / Diferença'`
- `description: 'Card isolado com Realizado, Meta e Diferença (cálculo automático).'`
- `defaultSpan: 1`
- `inputs:`
  - `realizado` — `source: 'kpis'`, required
  - `meta` — `source: 'kpis'`, required
  - `diferenca` — `source: 'kpis'`, opcional (se vazio, o card já calcula `realizado - meta`)
- `autoMap`: tenta achar KPIs cujo `key`/`label` casem com /realizad/, /meta/, /diferen/. Fallback: primeiros 2 KPIs.
- `render`: lê `ctx.kpis[mapping.realizado]`, `ctx.kpis[mapping.meta]`, `ctx.kpis[mapping.diferenca]` (este último pode ser vazio) e renderiza `<FaturamentoRealizadoMetaCard realizado={...} meta={...} diferenca={...} title={title || 'Faturamento'} />`.
- Import já parcial: adicionar `import { FaturamentoRealizadoMetaCard } from '@/components/bi/kpis/FaturamentoRealizadoMetaCard';`.

### 2. Liberar Aplicar no catálogo
`src/pages/BiComponentsDemoPage.tsx`:
- Trocar `nonApplicable` por `applyId="faturamento-realizado-meta-card"` no `DemoBlock` desse card.

## Fora de escopo
- Não mexer no card em si (já funciona standalone).
- Não criar novos KPIs no schema das páginas BI — o usuário escolhe entre os KPIs já existentes (ex.: `faturamento_realizado`, `meta_faturamento`, `diferenca_meta` no BI Comercial).

## Critério de aceite
1. Em `/biblioteca-bi`, o bloco "FaturamentoRealizadoMetaCard" agora mostra o botão **Aplicar**.
2. Ao clicar, abre o `ApplyComponentDialog` com três selects (Realizado, Meta, Diferença opcional) listando os KPIs da página escolhida.
3. Salvar cria um widget na página/seção escolhida; o card aparece renderizado com os valores reais.
