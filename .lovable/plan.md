## Objetivo

Fazer o Monitor de Telas Portal Web (`/monitor-telas` aba Portal Web) atualizar em tempo real, mantendo a lista de eventos sempre incluindo hoje (17/07/2026) sem precisar clicar em "Atualizar".

## Mudanças

### 1. `src/components/monitor-telas/MonitorTelasTab.tsx`
Substituir os 4 blocos manuais de `useState` + `useEffect` + `.then/.catch` (resumo, ranking, porDia, naoUt) por `useQuery` do `@tanstack/react-query`:

- Query keys estáveis por origem + filtros aplicados:
  - `['telemetria', origem, 'resumo', filtros]`
  - `['telemetria', origem, 'ranking', filtros, 100]`
  - `['telemetria', origem, 'por-dia', filtros]`
  - `['telemetria', origem, 'nao-utilizadas', filtros]`
- Opções em cada `useQuery`:
  - `refetchInterval: 30_000` (polling a cada 30s)
  - `refetchIntervalInBackground: false` (só quando aba está ativa)
  - `refetchOnWindowFocus: true`
  - `refetchOnReconnect: true`
  - `staleTime: 0` (sempre considerar stale para pegar eventos novos)
- `reloadKey` (via prop) passa a disparar `queryClient.invalidateQueries({ queryKey: ['telemetria', origem] })` num `useEffect`, mantendo o botão "Atualizar" da página funcionando.
- `load` interno (usado pelo `DeParaTelasModal onSaved`) vira função que invalida as mesmas queries.
- Indicador visual discreto de "Atualizado há Xs" no topo da aba (usando `dataUpdatedAt` do resumo) para deixar claro que está vivo.

### 2. Sem mudanças de contrato/API
Nenhuma alteração em `src/lib/navegacaoTelemetriaApi.ts`, endpoints ou payloads. O backend já usa `NOW()` como limite superior, então preset de 30 dias já inclui hoje — o polling garante que eventos gravados durante a sessão apareçam.

### 3. Sem mudanças na aba ERP Nativo além de herdar o mesmo comportamento
O mesmo componente serve as duas abas; o auto-refresh vale para ambas quando visíveis. `refetchIntervalInBackground: false` evita polling na aba não selecionada.

## Fora de escopo
- Novos presets de período (ex.: "Hoje") — usuário optou por manter 7/30/60/90.
- Date-picker de data final — não necessário.
- Alterações no backend, no `DeParaTelasModal`, no `HistoricoTelaModal` ou na `MonitorTelasPage` (filtros/tabs).

## Arquivos alterados
- `src/components/monitor-telas/MonitorTelasTab.tsx` (único)

## Validação
- Abrir `/monitor-telas` → Portal Web: KPIs carregam, e após 30s há novo request para `/resumo`, `/ranking`, `/por-dia`, `/nao-utilizadas` (visível em Network).
- Trocar de aba do navegador e voltar: dispara refetch imediato.
- Clicar "Atualizar" na página: invalida e re-busca todas as 4 queries.
- Trocar entre Portal Web/ERP Nativo: polling pausa na aba oculta.
