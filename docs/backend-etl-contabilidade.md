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

`acao_ref` aceita o `id_acao` (texto) **ou** o `id` (uuid) — resolvido pela função única descrita em [`docs/backend-etl-central.md` › "Resolução de `{acao_ref}`"](./backend-etl-central.md#resolução-de-acao_ref-regra-única-para-todos-os-endpoints-apietlacoesacao_ref).

> ⚠️ **Bug conhecido (jun/2026):** versões antigas do backend devolvem `404 "Ação ETL não encontrada: ETL_V_BALANCO_PATRIMONIAL"` porque tentavam casar `id_acao` como número ou procuravam uma coluna inexistente `codigo_acao`. A coluna correta é `etl_acoes.id_acao` (TEXT). O frontend já envia o valor textual correto.

### Smoke test (cada ação contábil)

```bash
BASE="https://<fastapi>"  # ex.: https://api.exemplo.ngrok.app
TOKEN="<jwt>"

for ACAO in VM_ORC_DRE VM_LANC_CONTABIL ETL_V_BALANCO_PATRIMONIAL ATU_CONTABILIDADE; do
  echo "== $ACAO =="
  curl -sS -X GET "$BASE/api/etl/acoes/$ACAO/comando-sql" \
    -H "Authorization: Bearer $TOKEN" \
    -H "ngrok-skip-browser-warning: true" | head -c 200
  echo
done

# Executar 1 ação isolada
curl -sS -X POST "$BASE/api/etl/acoes/ETL_V_BALANCO_PATRIMONIAL/executar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "ngrok-skip-browser-warning: true" \
  -H "Content-Type: application/json" \
  -d '{"anomes_ini":202601,"anomes_fim":202601,"acionado_por":"SMOKE"}'
```

Esperado: HTTP 200 com `execucao_id`. Qualquer 404 indica resolver fora do padrão.

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
