## Objetivo

Tornar **Centro de Recurso** (`cod_cre`) um filtro de refinamento livre na tela `/producao/impressao-op` — selecionável a qualquer momento (sem exigir OP), recarregando a grid e respeitado por "Imprimir todas".

## Arquivos a alterar

### `src/hooks/useOpcoesImpressaoOp.ts`
- Estender `OpcoesImpressaoParams` (já aceita `cod_cre`/`cod_etg`) — sem mudança de tipos.
- Novo `reloadByCentroRecurso(cod_emp, cod_cre, ctx?)` onde `ctx` aceita `cod_ori`, `num_ped`, `rel_prd`, `sit_orp`, `cod_etg`, `q`. Chama `/opcoes` com esses campos + `limite_ops=200`. Atualiza apenas `ops` (não mexer em estágios/centros para não esvaziar o select). Mantém saneamento (`sanitizeOps`, sem `cod_ori=100`, sem `sit_orp='C'`).
- Estender `SearchOpsContext` com `cod_cre` e `cod_etg`; `searchOps` repassa ambos.
- Estender `reloadByOrigem` / `reloadByPedido` / `reloadByRelatorio` / `reloadBySituacao` para aceitar `cod_cre` e `cod_etg` no `ctx` e repassar à API (mantendo assinatura compatível via parâmetro opcional).

### `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Novo handler `onChangeCentroRecurso(v)`:
  - `setFiltros({ ...f, cod_cre: v, num_orp: '' })` (libera OP escolhida; mantém estágio).
  - Não selecionar automaticamente OP.
  - Se vazio → re-disparar a carga conforme o filtro principal ativo (origem/pedido/relatório/situação) **sem** `cod_cre`.
  - Se preenchido → chamar `reloadByCentroRecurso(cod_emp, v, { cod_ori, num_ped, rel_prd, sit_orp, cod_etg })`.
- Atualizar `onChangeEstagio` para não exigir `num_orp`: quando há `cod_cre` ativo, recarregar grid com `cod_etg + cod_cre` (sem alterar lista de centros). Quando há OP escolhida, manter comportamento atual (`reloadCres`).
- Atualizar `onChangeOrigem` / `onChangePedido` / `onChangeRelatorio` / `onChangeSituacao` para repassar `cod_cre` e `cod_etg` correntes no contexto da chamada.
- Atualizar `searchOpsFetcher` para incluir `cod_cre` e `cod_etg`.
- Expandir `showGrid` para também aparecer com `cod_cre` (ou `cod_etg`) sozinho: `(num_ped || rel_prd || cod_ori || cod_cre || cod_etg) && !num_orp`.
- Remover `disabled={!filtros.num_orp}` dos selects Estágio e Centro de Recurso — passar a desabilitar só quando `!filtros.cod_emp`.
- `imprimirTodas`: permitir disparo quando houver pelo menos um entre `cod_ori`, `num_ped`, `rel_prd`, `cod_cre`. Encaminhar `cod_cre` (e `cod_etg`) ao `fetchImpressaoLote`.

### `src/lib/producao/opImpressaoLote.ts`
- Adicionar `cod_cre?: string` e `cod_etg?: string` em `ImpressaoOpLoteParams` e enviar no query string.

### `docs/backend-impressao-ordem-producao.md`
- Em `/opcoes`: documentar `cod_cre` (e `cod_etg`) como filtros de refinamento combináveis com qualquer outro filtro principal. Exemplos espelhando a mensagem do usuário.
- Em `/impressao/lote`: adicionar `cod_cre` e `cod_etg` à tabela de parâmetros (opcionais, combináveis).

## Regras preservadas
- `cod_ori = 100` continua bloqueada.
- OPs `sit_orp = 'C'` continuam excluídas.
- Nenhuma OP é selecionada automaticamente; usuário escolhe na grid.
- Colunas e mapeamentos da grid permanecem inalterados.

## Fora de escopo
- Layout/visual da tela.
- Implementação no backend FastAPI (apenas documentação).
