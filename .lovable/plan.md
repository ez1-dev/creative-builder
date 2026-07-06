## Objetivo

Fazer todos os gráficos configuráveis da Biblioteca BI nas páginas RH usarem, como fonte única de séries, o novo array `dashboard.series` (contrato uniforme `{ chave, label, pontos: [{label, valor}] }`) retornado pelos endpoints RH. Nada de agregação no front, nada de campos antigos (`por_filial`, `qtd`, `value`, etc.).

## Escopo

Frontend apenas (a Biblioteca BI + páginas RH). Backend / endpoints não mudam.

Páginas envolvidas:
- `src/pages/rh/ResumoFolhaPage.tsx` (RH-01)
- `src/pages/rh/QuadroColaboradoresPage.tsx` (RH-02)
- `src/pages/rh/ContratoExperienciaPage.tsx` (RH-03)
- `src/pages/rh/ProgramacaoFeriasPage.tsx` (RH-04)
- `src/pages/rh/TurnoverPage.tsx` (RH-05)
- `src/pages/rh/AbsenteismoPage.tsx` (RH-06)

## Detalhes técnicos

### 1. Novo helper `rhSeriesToRecord`

Novo arquivo `src/lib/rh/seriesAdapter.ts`:

```ts
export interface RhSeriePonto { label: string; valor: number; [k: string]: any }
export interface RhSerie { chave: string; label: string; pontos: RhSeriePonto[] }

// { chave: pontos } — formato consumido por PageDataContext.series
export function rhSeriesToRecord(series?: RhSerie[] | null): Record<string, RhSeriePonto[]> {
  const out: Record<string, RhSeriePonto[]> = {};
  (series ?? []).forEach((s) => { if (s?.chave) out[s.chave] = s.pontos ?? []; });
  return out;
}

// [{key,label}] — usado nos dropdowns "Série" dos diálogos
export function rhSeriesToOptions(series?: RhSerie[] | null): { key: string; label: string }[] {
  return (series ?? []).map((s) => ({ key: s.chave, label: s.label }));
}
```

### 2. `RhDashboardWithBiLibrary`

Trocar a prop `series?: Record<string, any>` por `series?: RhSerie[] | Record<string, any>` e normalizar antes de passar para `PageDataProvider`. Também guardar as `RhSerie[]` originais em um novo contexto/prop simples (via um Provider leve) ou expor via `PageDataContext` como `seriesCatalog` para os diálogos.

Solução mais simples: expor `seriesCatalog` como campo adicional no `PageDataContext` (opcional, mantém compat):

```ts
// PageDataContext.tsx — acrescentar
seriesCatalog?: { key: string; label: string }[];
```

`RhDashboardWithBiLibrary` calcula:
```ts
const seriesRecord = Array.isArray(series) ? rhSeriesToRecord(series) : (series ?? {});
const seriesCatalog = Array.isArray(series) ? rhSeriesToOptions(series) : undefined;
```
E repassa ambos ao provider.

### 3. Diálogos de configuração e adição

`src/components/rh/ConfigureRhWidgetDialog.tsx` e `src/components/rh/AddRhBiWidgetDialog.tsx`: para inputs com `source === 'series'`, usar como bag primeiro `ctx.seriesCatalog` (novo contrato) e cair para `page.schema.series` (retrocompat).

```ts
const seriesOpts = ctx?.seriesCatalog?.length
  ? ctx.seriesCatalog
  : (page?.schema.series ?? []);
```

Assim o dropdown reflete exatamente `dashboard.series` de cada tela — sem depender do registry estático.

### 4. Páginas RH

Em cada uma das 6 páginas, passar a resposta do dashboard como está:

```tsx
<RhDashboardWithBiLibrary
  pageKey="..."
  layout={layout}
  blocks={blocks}
  catalog={...}
  kpis={dash.data?.kpis}
  series={dash.data?.series}   // ← novo, array uniforme do backend
  filtros={filtrosAtuais}
/>
```

Isso preenche `PageDataContext.series` com `{ chave: pontos }` — que é exatamente o que os renderers de gráfico da Biblioteca BI já consomem (`label` / `valor` dentro de cada ponto — confere com `SERIES_LIKE` em `componentRegistry.tsx`).

### 5. Retrocompatibilidade

- Layouts já salvos que apontam para chaves antigas (`por_filial`, `por_faixa_etaria`, etc.) continuam funcionando porque o backend mantém esses arrays e passa a espelhá-los como itens do novo `series` sob as mesmas chaves. Se uma chave antiga não vier em `series`, o gráfico simplesmente mostra "Sem dados".
- Nada é agregado no front. Nenhum uso de `name`, `value`, `qtd`, `total`.

### 6. Não alterar

- `src/lib/bi/componentRegistry.tsx` (já opera sobre `{label,valor}[]`).
- `src/lib/bi/pageRegistry.ts` schemas RH — permanecem apenas como fallback caso `seriesCatalog` esteja vazio.
- Backend, endpoints, tipos gerados.

## Entregáveis

1. Novo `src/lib/rh/seriesAdapter.ts`.
2. `PageDataContext.tsx` recebe campo opcional `seriesCatalog`.
3. `RhDashboardWithBiLibrary.tsx` aceita `series` como array uniforme e monta `seriesRecord` + `seriesCatalog`.
4. `ConfigureRhWidgetDialog.tsx` e `AddRhBiWidgetDialog.tsx` priorizam `ctx.seriesCatalog` na origem `series`.
5. As 6 páginas RH passam `series={dash.data?.series}` para o wrapper.

## Fora do escopo

- Alterações em páginas não-RH.
- Remoção do schema `series` antigo do `pageRegistry.ts` (mantido como fallback).
- Mudanças em drill-downs, KPIs, tabelas custom das páginas RH.
