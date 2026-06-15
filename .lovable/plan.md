## Contexto

A tela já existe em `/etl/tarefas/ATU_CONTABILIDADE` (`src/pages/EtlTarefaDetalhePage.tsx`) e já carrega as 4 ações da tabela:

| ordem | id_acao | nome_acao | tabela_destino | estrategia | caso_erro | ativa |
|---|---|---|---|---|---|---|
| 1 | VM_ORC_DRE | Orçamento DRE | bi_vm_orc_dre | REPLACE_PERIODO | PARAR | sim |
| 2 | VM_LANC_CONTABIL | Lançamentos contábeis | bi_vm_lanc_contabil | REPLACE_PERIODO | PARAR | sim |
| 3 | ETL_V_BALANCO_PATRIMONIAL | Balanço patrimonial | bi_etl_v_balanco_patrimonial | REPLACE_PERIODO | PARAR | sim |
| 99 | ATU_CONTABILIDADE | Finalização contabilidade | — | REPLACE_PERIODO | CONTINUAR | sim |

O botão **SQL** já abre `EditarSqlModal` lendo/gravando o SQL daquela ação isolada, e o botão **Executar** já chama `POST /api/etl/acoes/{id_acao}/executar` por linha. A ação 99 já contém apenas `BEGIN ezortea.ATU_CONTABILIDADE($[ANOMES_INI],$[ANOMES_FIM]); END`.

## Diferença importante de nomenclatura (não precisa migração)

Os nomes pedidos no chat **não existem** no banco — o frontend já usa os corretos:

| pedido no chat | coluna real |
|---|---|
| `codigo_tarefa` | `etl_tarefas.nome_tarefa` |
| `codigo_acao` | `etl_acoes.id_acao` (text) |
| `comando_sql` | `etl_acoes.sql_template` |

`/api/etl/acoes/{acao_ref}/executar` recebe o `id_acao` como `{acao_ref}` (ver `docs/backend-etl-central.md`). Nada muda nesse contrato.

## Ajustes a fazer (somente frontend, na `EtlTarefaDetalhePage`)

1. **Renomear os cabeçalhos da tabela de Ações** para bater com o vocabulário pedido:
   - `ID` → **Código** (continua mostrando `id_acao`)
   - `Nome` → **Descrição** (continua mostrando `nome_acao`)
   - `Tabela` → **Tabela destino**
   - `Estratégia`, `Caso erro`, `Ativa` permanecem.
2. **Remover as colunas extras** que não foram pedidas para esta tela: `Endpoint` e `SQL (versão)`. A versão do SQL continua visível dentro do modal `EditarSqlModal`.
3. **Reordenar os botões da última coluna** para a ordem pedida: `SQL` e depois `Executar` (já está nessa ordem; manter).
4. **Manter** o comportamento atual de:
   - Modal `EditarSqlModal` carregando `sql_template` da ação clicada (visualizar/editar/salvar; admin edita, demais só leem).
   - `POST /api/etl/acoes/{id_acao}/executar` por linha via `ExecutarModal`.
   - Botão "Executar tarefa" no header, que dispara a tarefa inteira (ordem 1 → 2 → 3 → 99).
5. **Não alterar** `EtlTarefaDetalhePage` para outras tarefas: o ajuste de colunas vale só quando `tarefa.nome_tarefa === 'ATU_CONTABILIDADE'` — para `ATU_COMERCIAL` e demais tarefas a tela continua mostrando Endpoint + versão de SQL como hoje.

## Fora de escopo

- Nenhuma migração de schema (não criar `codigo_acao`/`codigo_tarefa`/`comando_sql`).
- Nenhuma mudança no backend FastAPI — o resolver de `{acao_ref}` por `id_acao` já está documentado em `docs/backend-etl-central.md` e `docs/backend-etl-contabilidade.md`.
- Conteúdo do SQL do `ETL_V_BALANCO_PATRIMONIAL` (hoje vazio no banco) — o usuário cola via botão **SQL** da própria tela; não vamos chumbar SQL em código.

## Arquivos afetados

- `src/pages/EtlTarefaDetalhePage.tsx` — apenas a definição de `acoesColumns` (condicional por `nome_tarefa`).
