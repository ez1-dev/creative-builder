## Diagnóstico
`Histórico Nº Colaboradores` vem de `GET /api/rh/quadro-colaboradores/historico?anomes_ini&anomes_fim` no FastAPI. Cada chamada varre o ERP mês a mês para contar ativos — por isso demora. Hoje o frontend refaz essa chamada toda vez que a página monta (ou o range muda) e não persiste nada entre navegações. Também não usa `staleTime`, então navegar sai → volta = nova requisição.

Ganhos possíveis, do mais barato ao mais impactante:

## Correções

### 1. Cache no cliente (ganho imediato, sem backend)
`src/pages/rh/QuadroColaboradoresPage.tsx` (histQ):
- `staleTime: 15 * 60_000` (15 min) — evita refetch em cada montagem.
- `gcTime: 60 * 60_000` — mantém no cache do React Query por 1h.
- `placeholderData: (prev) => prev` — mantém o gráfico anterior enquanto refaz, elimina o "esqueleto" visível ao trocar de range.
- `refetchOnWindowFocus: false`.

### 2. Cache persistente no Lovable Cloud (ganho grande em navegações e F5)
Já existe a tabela `dashboard_cache(cache_key, payload, filtros_hash, valid_until, created_at)`. Vamos usá-la como cache de leitura do histórico.

- Nova função `getHistoricoCached(anomesIni, anomesFim)` em `src/lib/rh/quadroDashboardApi.ts`:
  1. `cache_key = 'rh:quadro:historico:{anomesIni}:{anomesFim}'`.
  2. `SELECT payload FROM dashboard_cache WHERE cache_key=? AND valid_until > now()` → se hit, devolve imediatamente (< 50 ms).
  3. Se miss, chama FastAPI como hoje, e faz `UPSERT` em `dashboard_cache` com `valid_until = now() + 6h`.
- `useQuery` passa a chamar `getHistoricoCached`. Nada mais muda na UI.

### 3. Invalidação no "Sincronizar RH"
`QuadroColaboradoresPage` já invalida a query em `queryClient.invalidateQueries(["rh","quadro-historico"])` após sync. Complementar:
- Após o `POST /sync`, `DELETE FROM dashboard_cache WHERE cache_key LIKE 'rh:quadro:historico:%'` via `supabase.from('dashboard_cache').delete().like('cache_key', 'rh:quadro:historico:%')` — para que quem entrar no F5 na próxima vez veja dados frescos.

### 4. Prefetch em paralelo (opcional)
No mount do módulo RH (ou ao abrir a página), disparar `queryClient.prefetchQuery` do histórico junto com `dashQ` — as duas chamadas rodam em paralelo. Como o histórico é o que demora, quando o dashboard KPI termina o histórico já está quente.

## Fora de escopo (não vai neste plano)
- Materializar `bi_rh_headcount_mensal` via ETL — é a solução ideal (< 50 ms sempre), mas exige mudança no FastAPI/ETL. Se quiser, faço num plano seguinte.

## Validação
- Primeira abertura pós-deploy: mesmo tempo de hoje (miss do cache).
- Segunda abertura (mesmo range) ou F5: gráfico aparece < 100 ms (hit em `dashboard_cache`).
- Trocar range para um já visitado nas últimas 6 h: instantâneo.
- Clicar "Sincronizar RH": invalida cache do Cloud + React Query → próxima carga refaz do FastAPI.
- Trocar range para um inédito: mostra o gráfico anterior (placeholderData) enquanto carrega o novo, sem "esqueletar" a tela.
