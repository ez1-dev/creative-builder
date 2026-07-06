## Objetivo

Replicar o mesmo cache persistente (Lovable Cloud `dashboard_cache`, TTL 6h) + config React Query já aplicado ao "Histórico Nº Colaboradores" nas demais telas do módulo RH, deixando todas com carregamento < 100 ms a partir da 2ª visita (mesmos filtros) e sem "flash" ao trocar período.

## Telas / queries que entram no cache

| Tela | Fetcher hoje | Chave do cache (prefixo) |
|---|---|---|
| Quadro de Colaboradores — dashboard principal | `fetchQuadroDashboard(dataRef)` | `rh:quadro:dash:{dataRef}` |
| Turnover | `fetchTurnoverDashboard({ini,fim,codemp})` | `rh:turnover:{codemp}:{ini}:{fim}` |
| Absenteísmo | `fetchAbsenteismoDashboard({ini,fim,codemp})` | `rh:absenteismo:{codemp}:{ini}:{fim}` |
| Resumo da Folha — completo | `fetchResumoFolhaDashboard(params,"completo")` | `rh:folha:completo:{codemp}:{ini}:{fim}` |
| Resumo da Folha — mensal | `fetchResumoFolhaDashboard(params,"mensal")` | `rh:folha:mensal:{codemp}:{ini}:{fim}` |
| Contrato de Experiência | `fetchContratoExperienciaDashboard(codemp)` | `rh:contrato-exp:{codemp}` |
| Programação de Férias | `fetchProgramacaoFeriasDashboard(codemp)` | `rh:programacao-ferias:{codemp}` |

O "Histórico Nº Colaboradores" continua como está (`fetchQuadroHistoricoCached`).

Fetchers "comparação período anterior" (`addMonths(...)`) usados no widget de comparação também passam pelo mesmo wrapper, já que compartilham prefixo/chave.

## Estratégia técnica

### 1. Helper genérico de cache (`src/lib/rh/rhCache.ts`, novo)

- `withRhCache<T>(cacheKey: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T>`
  - SELECT em `dashboard_cache` filtrando `valid_until > now()` via `maybeSingle()`.
  - Miss → executa `fetcher`, faz UPSERT com `valid_until = now() + ttl` e `filtros_hash = cacheKey`.
  - Try/catch best-effort — qualquer erro do cache não pode derrubar a resposta.
- `invalidateRhCache(scopes?: string[])`
  - Sem argumento: apaga tudo com `cache_key LIKE 'rh:%'`.
  - Com escopos: apaga cada prefixo passado.
- Refatora `fetchQuadroHistoricoCached` e `invalidateHistoricoCache` (em `quadroDashboardApi.ts`) para reusarem o helper — mesma chave `rh:quadro:historico:...`.

### 2. Novos fetchers "cached" em `src/lib/rh/api.ts`

Para cada fetcher da tabela acima, exportar uma função irmã `xxxCached(...)` que só embrulha `withRhCache(chave, 6h, () => xxx(...))`.
`fetchQuadroDashboardCached` fica junto em `quadroDashboardApi.ts` (mesmo arquivo do original).

### 3. Ajustes nas páginas

Em cada `useQuery` das telas listadas:
- trocar `queryFn` para o novo `*Cached`;
- adicionar `staleTime: 15 * 60_000`, `gcTime: 60 * 60_000`, `refetchOnWindowFocus: false`, `placeholderData: (prev) => prev`.

Isso vale também para as sub-queries de comparação de período (`addMonths`) em `TurnoverPage`, `AbsenteismoPage`, `ResumoFolhaPage` — passam pelo cached porque compartilham as mesmas chaves.

`statusQuery` do `ResumoFolhaPage` (status leve da folha) fica fora — é rápida e serve de sinal de "dados prontos".
`listaQ` do `QuadroColaboradoresPage` (lista detalhada de colaboradores) fica fora — usada só quando abre drill-down, cache pode ficar desatualizado por muito tempo.

### 4. Invalidação após "Sincronizar RH"

Em `src/components/rh/SincronizarRhDialog.tsx`, trocar a chamada atual:

```ts
await invalidateHistoricoCache();
```

por:

```ts
await invalidateRhCache(); // limpa tudo `rh:%`
```

Assim, uma sincronização atualiza *todos* os dashboards do RH na próxima visita, e não só o "Histórico".

### 5. Migração / Cloud

Nenhuma. A tabela `dashboard_cache` já existe, com GRANTs e policies liberados (migration anterior).

## Fora de escopo

- Materializar tabelas `bi_rh_*` no ETL — ficou como plano separado no ciclo anterior.
- Adicionar cache em `FormulariosPage` e `RhIndexPage` — são consultas leves e já rápidas.
- Ajustar cache do `listaQ` do Quadro (drill-down colaboradores).

## Validação

- 1ª visita a cada tela do RH: mesmo tempo de hoje (miss).
- 2ª visita (mesmos filtros) ou F5: < 100 ms (hit no `dashboard_cache`).
- Troca de período dentro de 6 h: dados anteriores permanecem visíveis (`placeholderData`) até chegar o novo (hit ou miss).
- Após "Sincronizar RH": todos os dashboards refazem a busca (invalidação global `rh:%`).
