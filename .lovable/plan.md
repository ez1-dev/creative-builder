# Plano — /bi/comercial via FastAPI

A tela atual `/bi/comercial` consome a view `v_bi_faturamento_comercial` direto do Cloud e agrega no frontend. Vamos **substituir** essa lógica para consumir os 6 endpoints da FastAPI, mantendo o layout no padrão da biblioteca BI e da identidade visual UpQuery.

## 1. Camada de dados — `src/lib/bi/comercialApi.ts` (novo)

Cliente FastAPI usando o `api` existente (`src/lib/api.ts`, já injeta `ngrok-skip-browser-warning` e auth).

Helper genérico:
```ts
export function unwrapRpcResponse<T = any>(data: any, key: string): T | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    if (data.length === 1 && data[0]?.[key] !== undefined) return data[0][key];
    return data as T;
  }
  if (data[key] !== undefined) return data[key];
  return data as T;
}
```

Tipos e fetchers (todos aceitam `{ anomes_ini, anomes_fim, unidade_negocio }` via querystring):

- `fetchComercialKpis(params): Promise<ComercialKpis>` → `GET /api/bi/comercial/kpis` → `unwrap(..., 'bi_comercial_kpis')`
- `fetchComercialMensal(params): Promise<ComercialMensalRow[]>` → `/api/bi/comercial/mensal` → `unwrap(..., 'bi_comercial_mensal')`
- `fetchComercialMix(params): Promise<ComercialMixRow[]>` → `/api/bi/comercial/mix`
- `fetchComercialEstado(params): Promise<ComercialEstadoRow[]>` → `/api/bi/comercial/estado`
- `fetchComercialRevenda(params): Promise<ComercialRevendaRow[]>` → `/api/bi/comercial/revenda` (só GENIUS / CONSOLIDADO)
- `fetchComercialObras(params): Promise<ComercialObrasRow[]>` → `/api/bi/comercial/obras` (só ESTRUTURAL / CONSOLIDADO)

Tipos refletem os campos citados (kpis: `faturamento, meta, diferenca, pct_atingimento, fat_liquido, impostos, devolucao, numero_vendas, numero_clientes, numero_estados, quantidade, ticket_medio, preco_medio`; mensal: `anomes_emissao, faturamento, fat_liquido, impostos, devolucao, numero_vendas, numero_clientes, quantidade, ticket_medio, preco_medio, meta?`; etc.). Tolerantes a `null` (default 0).

## 2. Página — reescrever `src/pages/bi/ComercialPage.tsx`

Estrutura:

```text
PageHeader: "BI Comercial"
Filtros card: [Unidade ▼] [AnoMês Ini] [AnoMês Fim] [Atualizar]
KpiGrid (13 cards): Fat, Meta, Diferença, % Atingimento, Líquido, Impostos,
                    Devolução, Nº Vendas, Nº Clientes, Nº Estados, Qtd,
                    Ticket Médio, Preço Médio
Grid 2 col:
  - ComboChartCard mensal (barras: faturamento, fat_liquido, devolucao; linha: meta)
  - DonutChartCard "Mix acumulado" (de /mix)
DataTableBI mensal (10 colunas)
Grid 2 col:
  - FunnelChartCard "Top estados"  (de /estado)
  - BrazilMapCard (de /estado)
Bloco específico:
  - GENIUS → BarChartCard + DataTableBI de revenda
  - ESTRUTURAL → TreemapChartCard + DataTableBI de obras
  - CONSOLIDADO → ambos lado a lado
```

Comportamento:

- `Select` de unidade (`GENIUS | ESTRUTURAL ZORTEA | CONSOLIDADO`) e dois inputs anomes; padrão `202601`/`202606`.
- Usa **6 `useQuery`** independentes com `queryKey: ['bi-comercial', endpoint, filtros]`. Query de revenda só habilita quando `unidade ∈ {GENIUS, CONSOLIDADO}`; obras quando `∈ {ESTRUTURAL, CONSOLIDADO}`.
- Botão Atualizar chama `refetch()` em todas as queries ativas.
- Estados:
  - Loading: `LoadingState` no header + skeleton nos cards/gráficos enquanto `isLoading`.
  - Erro: `ErrorState` por bloco com `onRetry` na query daquele bloco e mensagem "Não foi possível carregar os dados do BI Comercial".
  - Vazio: `EmptyState` com "Sem dados para o período selecionado".
- Sem fallback mock.

Cores por unidade (tokens do design system, sem hex hardcoded):

```ts
const UNIDADE_STYLE = {
  GENIUS:              { bar: 'hsl(var(--warning))',           mapVar: '--warning',           trigger: '...' },
  'ESTRUTURAL ZORTEA': { bar: 'hsl(var(--primary))',           mapVar: '--primary',           trigger: '...' },
  CONSOLIDADO:         { bar: 'hsl(var(--muted-foreground))',  mapVar: '--muted-foreground',  trigger: '...' },
};
```

Aplicado a ComboChart `barColor`, BarChart `color`, BrazilMap `colorVar`, e ao chip da unidade ativa.

Formatação reusando `formatCurrency / formatNumber / formatPercent / formatQuantity` de `@/components/bi`. Valores `null` exibidos como 0.

## 3. Remover dependência da view direta

- `src/lib/bi/comercial.ts` (fetch direto da view) deixa de ser usado pela página. Manter o arquivo (pode ser útil em diagnóstico), porém remover qualquer import dele em `ComercialPage.tsx`.
- A view `v_bi_faturamento_comercial` no Cloud **continua existindo** (Validação/Conciliação pode usá-la), mas a tela principal /bi/comercial não a consulta mais.

## 4. Sem alterações em

- `App.tsx`, `AppSidebar.tsx`, `screenCatalog.ts` (rota já existe).
- Componentes BI existentes (`KpiGrid`, `ComboChartCard`, `DonutChartCard`, `FunnelChartCard`, `BrazilMapCard`, `BarChartCard`, `TreemapChartCard`, `DataTableBI`, `DashboardTabs`/`Select`).
- Backend FastAPI (assumido já implementado com os 6 endpoints e a regra de unidade).
- Telas de Validação/Conciliação que consomem fontes alternativas.

## 5. Critério de aceite

Com `anomes_ini=202601`, `anomes_fim=202606`, `unidade=GENIUS`, KPIs ≈:
Faturamento 1.816.792,46 · Líquido 1.584.984,70 · Impostos −231.807,76 · Devolução 13.003,49 · Vendas 148 · Clientes 40 · Estados 9 · Quantidade 16.368.

Trocando para ESTRUTURAL ZORTEA, os valores devem coincidir com a view comercial validada.

## Detalhes técnicos

- Querystring montada via `URLSearchParams`; `unidade_negocio` enviado como string exata (`"GENIUS"`, `"ESTRUTURAL ZORTEA"`, `"CONSOLIDADO"`).
- `api.get<T>(endpoint, query)` já existe em `src/lib/api.ts` e cuida de headers, auth e erros amigáveis — usar.
- `unwrapRpcResponse` aplicado em todos os fetchers para tolerar `array direto` ou `{ chave: ... }`.
- Sem novos pacotes; sem migrações; sem edição de `client.ts`/`types.ts`/`.env`.
