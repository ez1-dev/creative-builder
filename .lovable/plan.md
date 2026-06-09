## Mudanças

### 1. Card Resumo Faturamento agora consome 100% da API
`src/pages/bi/ComercialPage.tsx`:

- **Remover** `qMetaCloud` (useQuery) e `fetchMetaCloudTotal` (import).
- **Remover** o `useMemo` que sobrescrevia `kpis.meta / diferenca / pct_atingimento` com o valor do Cloud. `kpis` passa a ser direto `qKpis.data ?? {}`.
- Remover `qMetaCloud.refetch()` do handler `atualizar` e do `handleSyncMetas`.
- Ajustar `ComercialKpis` (em `src/lib/bi/comercialApi.ts`) para incluir os fallbacks opcionais que a API pode devolver: `faturamento_liquido`, `vl_realizado`, `realizado`, `vl_meta` (todos opcionais — não quebra contrato).

### 2. Realizado = Líquido (com fallbacks)
No bloco `w.type === 'resumo-faturamento'`:

```ts
const realizado = Number(
  kpis?.faturamento_liquido
  ?? kpis?.fat_liquido
  ?? kpis?.vl_realizado
  ?? kpis?.realizado
  ?? kpis?.faturamento  // último fallback, evita zerar
  ?? 0
);
const meta = Number(kpis?.meta ?? kpis?.vl_meta ?? 0);
const diferenca = realizado - meta;
```

E os 3 itens do `KpiTriStackCard` usam `realizado`, `meta`, `diferenca` (em vez de `kpis.faturamento / kpis.meta / kpis.diferenca`).

### 3. Loading / erro / fallback zero
Já existe: `qKpis.isLoading` → `LoadingState`; `qKpis.isError` → `BlocoErro`. O fallback `?? 0` só age quando a API não trouxe o campo. Mantenho.

### 4. Botão "Atualizar metas" (já existe)
Já implementado na rodada anterior — fica como está:
- Visível só para `isAdmin`.
- Chama `sincronizarMetasUpquery({ anomes_ini, anomes_fim })` (proxy edge function → `POST /api/bi/comercial/metas/sincronizar`, origem default `UPQUERY_VM_FATURAMENTO`).
- Após sucesso, refetch só `qKpis` (sem `qMetaCloud` agora).

> Observação: seu prompt sugere `origem: "UPQUERY_V_FATURAMENTO_META"`. O contrato atual da edge function/backend usa `UPQUERY_VM_FATURAMENTO` (confirmado em `mem://features/sincronizacao-metas-upquery` e em `metasFaturamentoApi.ts`). Mantenho o valor já em uso para não quebrar o backend; se você quiser trocar a string da origem, me confirme antes que eu envio o novo valor.

### 5. Filtros aplicados ao GET /api/bi/comercial/kpis
Já é assim hoje via `fetchComercialKpis(filters)` — envia todos os filtros do dashboard (`anomes_ini`, `anomes_fim`, `unidade_negocio`, mais drill). `fonte_acao` não existe no contrato do BI Comercial — ignorado.

## Arquivos alterados

- `src/pages/bi/ComercialPage.tsx` — remove `qMetaCloud` + override; aplica cadeia de fallbacks Realizado/Meta no `resumo-faturamento`; refetch limpo no `handleSyncMetas`.
- `src/lib/bi/comercialApi.ts` — adiciona campos opcionais (`faturamento_liquido?`, `vl_realizado?`, `realizado?`, `vl_meta?`) ao type `ComercialKpis`.

## Fora de escopo (NÃO mexer)

- `src/lib/bi/metasFaturamentoApi.ts` — `fetchMetaCloudTotal` continua exportada (usada por outras telas como `/bi/comercial/metas`).
- `supabase/functions/sync-metas-upquery/index.ts` — sem mudança.
- Outros widgets (`kpi-meta`, `kpi-diferenca`, `gauge-atingimento`, `serie-mensal`) — continuam lendo `kpis.meta` direto da API, sem override (efeito colateral desejado da remoção).

## Impacto

- A Meta exibida no card passa a vir **exclusivamente** da RPC `bi_comercial_kpis` da FastAPI. Se a RPC não estiver preenchendo o campo `meta`, o card mostrará `R$ 0,00` até a sincronização rodar e a RPC ler `bi_meta_faturamento`. O botão "Atualizar metas" resolve isso disparando o sync.
- `Realizado` muda de **Bruto** → **Líquido** no card Resumo Faturamento. Outros widgets de KPI continuam expondo Bruto/Líquido como configurados em `comercialMetrics.ts`.