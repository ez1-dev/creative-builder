## Objetivo

Corrigir a tela "01 — Resumo da Folha" para que sempre exiba o payload mais recente do backend e para que o botão "Sincronizar RH" realmente atualize cards, grid e drills após concluir. Sem tocar em regras de cálculo, backend ou composição dos KPIs — o problema é 100% de cache/invalidação no frontend.

## Diagnóstico (código atual)

1. `src/pages/rh/ResumoFolhaPage.tsx` (linhas 94–115): as duas `useQuery` do dashboard usam `staleTime: 15 * 60_000` e `refetchOnWindowFocus: false`. Ao voltar para a tela, o React Query devolve o cache em memória sem refetch.
2. `src/lib/rh/api.ts` (linhas 927–933) + `src/lib/rh/rhCache.ts`: `fetchResumoFolhaDashboardCached` envolve a chamada em `withRhCache` com TTL de **6 horas** persistido em `dashboard_cache` (Lovable Cloud). Esse cache sobrevive a refetch e a Ctrl+F5 — é a causa raiz de "V.A. continua Pendente".
3. `syncMut.onSuccess` (linhas 172–186 e 216–241): só chama `qc.invalidateQueries({ queryKey: ["rh", "resumo-folha-dashboard"] })`. Não invalida o cache Cloud (`invalidateRhCache`), não invalida `["rh", "resumo-folha-drill"]`, nem `["rh", "turnover"]`, nem grid/filiais. Também não força `refetchQueries`, então a UI pode continuar mostrando o snapshot anterior até o próximo mount.
4. Não há aviso de "mês em aberto" quando o período inclui o mês corrente, nem timestamp visível de última sincronização.

## Alterações

### 1. `src/pages/rh/ResumoFolhaPage.tsx`

- Trocar as duas `useQuery` do dashboard (`"completo"` e `"mensal"`) para chamar `fetchResumoFolhaDashboard` diretamente (sem o wrapper `Cached`), com:
  - `staleTime: 0`
  - `gcTime: 5 * 60_000`
  - `refetchOnMount: "always"`
  - `refetchOnWindowFocus: true`
  - manter `placeholderData: (prev) => prev` só para evitar flicker durante o refetch.
- Remover o `useEffect` de flag `rh-resumo-folha-invalidated-v2` (linhas 82–92) — vira ruído com `staleTime: 0`.
- No `syncMut.onSuccess` e no efeito de polling do `statusQuery` (após "OK"):
  1. `await invalidateRhCache()` (limpa o cache Cloud com prefixo `rh:`).
  2. `await qc.invalidateQueries({ queryKey: ["rh"] })` (pega dashboard, drills, turnover, quadro, etc. — todas usam prefixo `["rh", ...]` ou `["dg-rh", ...]`; também invalidar `["dg-rh"]` explicitamente).
  3. `await qc.refetchQueries({ queryKey: ["rh", "resumo-folha-dashboard"], type: "active" })`.
  4. `await qc.refetchQueries({ queryKey: ["rh", "resumo-folha-drill"], type: "active" })`.
  5. Salvar timestamp local (`ultimaSincronizacao = new Date()`) e exibir "Atualizado às HH:MM:SS" ao lado do botão.
- Botão "Sincronizar RH": manter `disabled={syncing}` (já existe), continuar impedindo POST duplicado via `syncMut.isPending`.
- Adicionar aviso discreto (badge/alerta) quando `baseParams.anomes_fim >= YYYYMM do mês atual`:
  "Mês em aberto: os valores podem mudar até o fechamento da folha." Não bloqueia consulta.
- Nenhum valor de referência hardcoded. Nenhuma alteração em `KpiOrMissing`, tooltips já existentes de V.A./Benefícios/Rescisões permanecem.

### 2. `src/components/rh/ResumoFolhaDrillDrawer.tsx`

- Confirmar (e ajustar se necessário) que a `useQuery` do drill usa `staleTime: 0` e `refetchOnMount: "always"` para refletir o refetch pós-sincronização quando o drawer estiver aberto.

### 3. `src/lib/rh/api.ts`

- Não remover `fetchResumoFolhaDashboardCached` (outros hooks ainda usam), apenas parar de usá-lo na página Resumo da Folha.
- Nenhuma mudança em `normalizeDashboard`, `buildKpis`, `KPI_ALIASES` — os campos `va`, `outras_gratificacoes`, `beneficios`, `inss_total`, etc. já são lidos direto do payload sem fallback/soma.

### 4. Nada muda

- Backend, listas de eventos, RPCs, composição de V.A./Benefícios/Salário/Rescisões, Supabase, edge functions.
- Nenhum cálculo de card no frontend (auditado: `KpiOrMissing` só formata; a página só soma `kpisValues` para detectar "sem dados", sem exibir esse total como KPI).

## Validação

- `tsgo` limpo.
- Playwright headless em `http://localhost:8080` (após login mockado, se disponível) navegando para `/rh/resumo-folha`:
  1. Screenshot inicial — confirmar que os cards refletem os `kpis` mais recentes do payload real (sem tocar em valores esperados).
  2. Clicar em "Sincronizar RH" — confirmar spinner, botão desabilitado, um único POST em `network requests`.
  3. Após toast de sucesso — confirmar via `console logs` que `[RH ResumoFolha] dashboard` reapareceu com novo `kpis`, e que o drill (se aberto) refez o request.
- Reportar ao usuário:
  - arquivos alterados;
  - query keys invalidadas/refetch;
  - comportamento do botão (spinner, disabled, one-flight);
  - remoção do cache Cloud dessa rota;
  - payload real capturado no console (sem gravar no código);
  - confirmação de que não há cálculo de KPI no frontend.
