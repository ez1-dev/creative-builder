Melhorar carregamento, sincronização e cache do frontend do RH sem tocar em backend, cálculos, endpoints ou contratos.

## 1. Timeout longo para sincronização

`src/lib/api.ts`
- Estender `request<T>(endpoint, options, { timeoutMs? })` com `AbortController` opcional.
- `post<T>` recebe 3º argumento `{ timeoutMs? }` (default: sem timeout, mantém comportamento atual das leituras).
- Quando o `AbortController` disparar, lançar `Error` com `code = 'CLIENT_TIMEOUT'`, `isTimeout = true` e `statusCode = 0` — distinto de `isNetworkError`.

`src/lib/rh/api.ts`
- `sincronizarRh`, `sincronizarResumoFolha`, `sincronizarVmFolha` passam `timeoutMs: 10 * 60_000` (10 min).
- Sem outras mudanças de contrato/URL.

## 2. Fluxo de sincronização em `ResumoFolhaPage`

`src/pages/rh/ResumoFolhaPage.tsx`
- Botão "Sincronizar RH" já é desabilitado por `syncing`; reforçar:
  - Texto: `Sincronizando RH…` com `<Loader2 />`.
  - Legenda persistente abaixo do botão: "A sincronização pode levar alguns minutos. Você pode manter a aba aberta."
- `onError` do `syncMut`: quando `e.isTimeout` (ou `e.code === 'CLIENT_TIMEOUT'`):
  - **NÃO** mostrar "API offline" nem erro vermelho.
  - `toast.info("A solicitação demorou mais que o esperado. A sincronização pode continuar em processamento.")`.
  - Manter `syncInFlight = true`, iniciar polling via `syncJobId = 'pending'` (já existente) e exibir botão **"Verificar resultado"** ao lado do "Sincronizar RH".
- "Verificar resultado": dispara `consultarStatusSincronizacaoRh` + `refetchAfterSync()`; se dashboard voltar com dados novos, encerra o estado de sincronização.
- `refetchAfterSync` já invalida `["rh"]`, `["dg-rh"]` e refaz `resumo-folha-dashboard` + drills — manter e adicionar `refetchQueries` para `["rh","turnover"]`, `["rh","absenteismo"]`, `["rh","quadro-dashboard"]`, `["rh","quadro-historico"]`, `["rh","contrato-experiencia"]`, `["rh","programacao-ferias"]` (apenas `type: "active"` para não disparar telas fora do foco).

## 3. Cache padronizado das leituras RH

Ajustar todas as `useQuery` das telas RH para o mesmo padrão (chaves já contêm `codemp/anomes/…`):
- `staleTime: 2 * 60_000`
- `gcTime: 10 * 60_000`
- `refetchOnWindowFocus: false`
- `refetchOnMount` fica no default (só refaz se `stale`).

Arquivos:
- `src/pages/rh/ResumoFolhaPage.tsx` (2 queries: `completo`, `mensal`) — hoje `staleTime: 0`.
- `src/pages/rh/AbsenteismoPage.tsx`, `TurnoverPage.tsx`, `ContratoExperienciaPage.tsx`, `ProgramacaoFeriasPage.tsx`, `QuadroColaboradoresPage.tsx` — hoje `staleTime: 15 min`; reduzir para 2 min conforme spec (chaves já corretas).

Botão "Atualizar" existente continua chamando `query.refetch()` / `refetchAfterSync()` — força bypass do cache. Nenhuma reutilização entre chaves diferentes (período/filial/empresa já fazem parte da queryKey).

## 4. Skeletons

Estabilizar o carregamento (evitar tela branca / spinner central):

- `ResumoFolhaPage`: já usa `KpiOrMissing` com `loading` e skeleton nos cards; adicionar `<Skeleton />` nos containers de gráfico (Donut/BarChart) e nas tabelas de proventos/descontos/tipos de evento e filiais quando `isLoading`. Manter altura fixa dos cards para não haver salto.
- `TurnoverPage`, `AbsenteismoPage`, `ContratoExperienciaPage`, `ProgramacaoFeriasPage`, `QuadroColaboradoresPage`: adicionar `<Skeleton />` para KPIs, gráfico principal, tabela/ranking e grid por filial quando `isLoading`; manter layout estável.

Nenhuma mudança em `RhIndexPage`/`FormulariosPage` (sem carregamento pesado).

## 5. Mensagens de erro diferenciadas em `ResumoFolhaPage`

- Erro real da API (`isError && !indisponivel && !isTimeout`): mensagem existente "Não foi possível consultar os dados do RH." + detalhe técnico.
- `SincronizacaoCompatIndisponivelError`: manter `toast.info` atual.
- Timeout do cliente na sync: mensagem descrita em §2.
- `data` vazio (KPIs todos zerados / `_missing_kpis` cobre tudo): banner "Nenhum dado encontrado para os filtros selecionados.".
- Estado "sincronizando" já tem badge/toast dedicados.

## 6. Não alterado
- `src/lib/rh/api.ts` só ganha o `timeoutMs`; nenhum cálculo/normalização muda.
- `src/lib/rh/seriesBuilders.ts`, `eventoBuckets.ts`, `filtros.ts`, `quadroDashboardApi.ts`, `relatorio.ts`, `rhCache.ts`, `types.ts`, `widgetCatalogs.ts` — inalterados.
- Backend, Supabase, formato JSON, endpoints, `drills_menu`, V.A., Salário Base, Rescisões, Benefícios — inalterados.

## Arquivos alterados (previsão)
- `src/lib/api.ts`
- `src/lib/rh/api.ts`
- `src/pages/rh/ResumoFolhaPage.tsx`
- `src/pages/rh/TurnoverPage.tsx`
- `src/pages/rh/AbsenteismoPage.tsx`
- `src/pages/rh/ContratoExperienciaPage.tsx`
- `src/pages/rh/ProgramacaoFeriasPage.tsx`
- `src/pages/rh/QuadroColaboradoresPage.tsx`

## Relatório final (será entregue no fim da implementação)
Timeout, queryKeys usadas, `staleTime`/`gcTime`, comportamento pós-timeout, queries invalidadas após sincronização e telas com skeleton.