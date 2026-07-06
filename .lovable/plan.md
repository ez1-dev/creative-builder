## Objetivo
Deixar o layout editável do RH (Resumo Folha, Quadro, Contratos, Férias, Turnover, Absenteísmo) rápido e estável — sem "voltar sozinho" após arrastar/redimensionar.

## Causas raiz
1. `useRhModuleLayout.saveLayout` faz `UPDATE` sequencial por widget dentro de um `for … await`, seguido de `load({silent:true})` completo. Cada gesto de drag/resize dispara N+2 round-trips e re-renderiza toda a árvore de widgets (Recharts é caro).
2. Sem debounce/coalescing em `saveGeometries`: enquanto um save está em voo, outro pode entrar e a resposta antiga sobrescreve o layout novo.
3. `PassagensLayoutGrid` usa `widgetGeometryKey` para forçar re-sync do `localLayout`; como o reload silencioso muda a referência dos widgets, a UI "pula" para o valor antigo momentâneo entre o commit local e a confirmação do banco.
4. `mergeWithDefaults` não deduplica quando há saved+default com mesmo `type` mas positions diferentes — pode reordenar visualmente ao recarregar.

## Correções

1. **`src/hooks/useRhModuleLayout.ts`**
   - Trocar o loop `for … await UPDATE` por **um `upsert` em lote** em `dashboard_widgets` (`onConflict: 'dashboard_id,type'`), com todas as linhas de uma vez. Para linhas novas, resolver `block_id` uma única vez fora do loop.
   - **Optimistic update**: `saveLayout` atualiza `widgets` local imediatamente com o payload (layout, hidden, position) e SÓ recarrega do banco em caso de erro (rollback) ou quando `resetLayout` for chamado.
   - Remover o `load({silent:true})` do caminho feliz.
   - Serializar saves concorrentes com um `pendingRef` (fila de 1): se um save entra enquanto outro está em voo, guarda o "último desejado" e dispara ao terminar. Evita corrida.
   - `mergeWithDefaults`: quando um `type` já existe em `saved`, ignora o default; garantir ordenação estável usando `position` do saved primeiro, defaults depois preservando ordem original.

2. **`src/components/passagens/PassagensLayoutGrid.tsx`** (só o consumo RH usa `saveGeometries`; efeito colateral em Passagens é neutro pois lá também há optimistic no hook)
   - Adicionar **debounce de 250 ms** no `onLayoutChange` interno (`handleStop`) antes de emitir para o pai. Coalesca vários commits rápidos.
   - Não sincronizar `localLayout` a partir de `widgetGeometryKey` enquanto `editing===true` — a fonte da verdade em edição é o `localLayout`. Só ressincronizar ao sair do modo edição ou quando a lista de tipos muda.

3. **`src/components/rh/RhDashboardGrid.tsx`**
   - Envolver as páginas RH que chamam o grid com `React.memo`/`useMemo` para `blocks` (várias já usam, mas confirmar `Quadro` e `ResumoFolha` para não recriar Recharts a cada render).
   - Não altera contrato — segue como wrapper fino sobre `PassagensLayoutGrid`.

## Fora de escopo
- Não mexer no fluxo do BI Comercial / Passagens (mesmo grid, mas o hook é outro; a única mudança compartilhada é o debounce em `handleStop`, que é benéfica também lá).
- Nada de mudanças em backend/edge functions ou schema. Todas as tabelas necessárias (`dashboards`, `dashboard_widgets`) já têm `unique(dashboard_id,type)` implícito na lógica atual — se o índice único não existir, o upsert usa `onConflict` explícito equivalente.

## Validação
- Abrir `/rh/quadro-colaboradores` em edição: arrastar 3 blocos em sequência rápida → cada bloco fica onde foi solto, sem voltar ao original; apenas um write POST em rede por gesto (após debounce).
- Redimensionar via `+/-`: reflete instantaneamente, sem flicker.
- Sair da edição e reentrar: layout persistiu igual ao editado.
- Ocultar / mostrar widget: instantâneo, sem reload visual.
- Reset: volta aos defaults e recarrega uma única vez.
- Nas outras 5 páginas RH: mesmo comportamento.
