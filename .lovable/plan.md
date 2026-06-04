## Objetivo

Ao abrir a tela `/bi/faturamento-validacao`, os filtros já vêm preenchidos e aplicados automaticamente (sem precisar clicar em "Aplicar").

## Valores padrão

- **AnoMês Início**: `202601`
- **AnoMês Fim**: ano/mês atual (ex.: `202606`) — já é o comportamento atual
- **Fonte Ação**: `faturamento,faturamento_manual`
- **Unidade Negócio**: `GENIUS,ESTRUTURAL ZORTEA`
- **CD Tp Movimento**: `S`
- **CD Origem**: `PROP`

Demais campos (`cd_empresa`, `cd_filial`, `cd_tns`, `cd_centro_custos_3`, `cd_nf`) continuam vazios.

## Alteração

Arquivo único: `src/pages/bi/FaturamentoValidacaoPage.tsx`

- Ajustar o estado inicial `draft` e `filtros` para já incluir os 6 valores acima.
- Como `filtros` é inicializado a partir do `draft`, as 6 queries (`qResumo`, `qMov`, `qTns`, `qDet`, `qUniCom`, `qUniTec`) já disparam com os filtros aplicados no primeiro render.
- Usuário ainda pode editar/limpar qualquer campo e clicar em "Aplicar".

Nenhuma mudança em backend, RPCs, docs ou na camada `src/lib/bi/faturamentoValidacao.ts`.
