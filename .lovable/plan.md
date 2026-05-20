## Objetivo

Permitir que selecionar **Origem** sozinha carregue automaticamente todas as OPs daquela origem na grid da tela `/producao/impressao-op`, sem exigir Pedido, Relatório de Produção ou Nº OP.

## Arquivos a alterar

- `src/hooks/useOpcoesImpressaoOp.ts` — adicionar `reloadByOrigem(cod_emp, cod_ori, ctx?)` que chama `/api/producao/ordem-producao/opcoes` com `cod_ori`, opcionalmente `sit_orp` e `q`, `limite_ops=200`. Atualiza `ops`, `estagios`, `centros_recurso`. Também estender `reloadBySituacao` para repassar `cod_ori` quando presente, e `searchOps` para incluir `cod_ori` no contexto.
- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`:
  - Novo handler `onChangeOrigem(v)`: define `cod_ori`, limpa `num_orp/cod_etg/cod_cre` (mantém Pedido/Relatório/Situação). Se `v` vazio → recarrega base. Caso contrário chama `reloadByOrigem` combinando com `sit_orp`/`num_ped`/`rel_prd` atuais (origem pode ser usada sozinha ou combinada).
  - Atualizar `onChangeSituacao` para também repassar `cod_ori` quando setado.
  - Atualizar `searchOpsFetcher` para incluir `cod_ori`.
  - Expandir `showGrid` para `Boolean((num_ped || rel_prd || cod_ori) && !num_orp)` — assim a grid aparece quando apenas Origem está selecionada.
  - `imprimirTodas`: aceitar também o caso "somente Origem" — passar `cod_ori` adiante. Atualizar mensagem.
  - Mensagem do estado vazio inicial: incluir "Origem" como ponto de partida válido.
- `src/lib/producao/opImpressaoLote.ts` — aceitar `cod_ori` opcional e enviar no querystring para `/impressao/lote` (alternativo a `num_ped`/`rel_prd`).
- `docs/backend-impressao-ordem-producao.md` — registrar:
  - `/opcoes` pode ser chamado apenas com `cod_emp` + `cod_ori` (+ `sit_orp` ou `q` opcionais) com `limite_ops` até 200.
  - `/impressao/lote` passa a aceitar `cod_ori` como filtro alternativo a `num_ped`/`rel_prd`.

## Regras preservadas

- `cod_ori = 100` continua bloqueada (`dropOri100Origens` / validações já existentes).
- OPs com `sit_orp = 'C'` continuam excluídas no client (`sanitizeOps`) — backend deve manter exclusão também.
- Grid mantém colunas e mapeamentos já definidos (Origem, OP, Pedido, Rel. Produção, Produto, Descrição, Qtde, Un., Situação, Geração, Início Prev., Ações).
- Nenhuma OP é selecionada automaticamente; usuário escolhe na grid (Visualizar/Imprimir) ou usa "Imprimir todas".
- Origem combinável com Situação, Pedido, Relatório e busca textual `q`.

## Fora do escopo

- Mudanças visuais no layout do filtro (mantém Command bar compacta atual).
- Alterações no backend FastAPI (apenas documentação).
