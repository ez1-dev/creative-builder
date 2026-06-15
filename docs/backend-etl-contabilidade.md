# ETL — ATU_CONTABILIDADE

Tarefa cadastrada em `public.etl_tarefas` (`nome_tarefa = 'ATU_CONTABILIDADE'`, grupo `CONTABILIDADE`) e 4 ações em `public.etl_acoes`. O SQL real de cada ação é editado pelo frontend (modal Editar SQL) e versionado em `etl_acao_sql_versoes` via trigger `etl_acoes_versionar_sql`.

## Ações

| ordem | id_acao | tabela_destino | coluna_periodo | tipo_comando | caso_erro |
|---|---|---|---|---|---|
| 1 | VM_ORC_DRE | bi_vm_orc_dre | anomes_referente | SQL | PARAR |
| 2 | VM_LANC_CONTABIL | bi_vm_lanc_contabil | anomes_referente | SQL | PARAR |
| 3 | ETL_V_BALANCO_PATRIMONIAL | bi_etl_v_balanco_patrimonial | anomes_referente | SQL | PARAR |
| 99 | ATU_CONTABILIDADE | — | — | FUNCAO | CONTINUAR |

Colunas novas em `etl_acoes`: `coluna_periodo text`, `tentativas smallint default 1`.

## Endpoints esperados (FastAPI)

Reaproveitam o executor genérico de `ATU_COMERCIAL` (`docs/backend-etl-central.md`). Frontend já chama tudo isso pela tela `/etl/tarefas/ATU_CONTABILIDADE`.

```
GET   /api/etl/tarefas/ATU_CONTABILIDADE/acoes
GET   /api/etl/acoes/{acao_ref}/comando-sql
      -> { comando_sql, versao, atualizado_em }
PATCH /api/etl/acoes/{acao_ref}/comando-sql
      body: { comando_sql?, tabela_destino?, coluna_periodo?, ordem?, ativa?, caso_erro?, tentativas? }
POST  /api/etl/acoes/{acao_ref}/testar-sql
      body: { parametros: { ANOMES_INI, ANOMES_FIM }, sql_template?, limite? }
POST  /api/etl/tarefas/ATU_CONTABILIDADE/executar
      body: { anomes_ini: "AAAAMM", anomes_fim: "AAAAMM", acionado_por: "USUARIO" }
GET   /api/bi/contabilidade/dre  (já existe — lê bi_vm_orc_dre, bi_vm_lanc_contabil, bi_dre_estrutura, bi_dre_mascara)
```

`acao_ref` aceita o `id_acao` (texto) ou o `id` (uuid).

## Comportamento do executor (para cada ação SQL)

1. Lê `comando_sql` salvo no Cloud (`etl_acoes.sql_template`).
2. Substitui `$[ANOMES_INI]` e `$[ANOMES_FIM]` pelos valores do payload.
3. Conecta no ERP Senior via `etl_conexoes` da tarefa.
4. `DELETE FROM <tabela_destino> WHERE <coluna_periodo> BETWEEN :ini AND :fim` no Cloud (service role).
5. `INSERT` em lote a partir do resultado da query do ERP.
6. Atualiza `etl_execucoes`, `etl_acao_execucoes` (qtd_linhas, status, iniciado_em, finalizado_em) e grava `etl_logs`.
7. Respeita `caso_erro` (`PARAR` interrompe a tarefa; `CONTINUAR` passa para a próxima ação) e `tentativas` (retries).

A ação `ATU_CONTABILIDADE` (ordem 99, `tipo_comando = FUNCAO`) é apenas fechamento — marca conclusão e dispara qualquer pós-processamento, sem `tabela_destino`/`coluna_periodo`.

## Frontend

Menu: **BI > Contabilidade — Atualização** → `/etl/tarefas/ATU_CONTABILIDADE`. A tela genérica `EtlTarefaDetalhePage` cobre todas as colunas pedidas (ORDEM, AÇÕES, NOME, DEPENDÊNCIA, CASO ERRO, TENT., SITUAÇÃO, INÍCIO, FIM) e os botões por linha (Executar / Ver log / Editar SQL / Testar SQL / Inativar) + botão **Executar tarefa**.
