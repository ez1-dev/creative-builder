## Preencher endpoint e tabela das 3 ações no Cloud

As ações `VM_FATURAMENTO_MANUAL`, `VM_FAT_CONTABIL` e `VM_FAT_TRB` estão registradas em `etl_acoes` mas com `endpoint_api` e `tabela_destino` vazios, por isso aparecem com "—" na grade.

### Migration

`UPDATE public.etl_acoes` aplicando:

| id_acao | endpoint_api | tabela_destino |
|---|---|---|
| VM_FATURAMENTO_MANUAL | `/api/etl/comercial/faturamento-manual` | `bi_faturamento` |
| VM_FAT_CONTABIL | `/api/etl/comercial/faturamento-contabil` | `bi_faturamento` |
| VM_FAT_TRB | `/api/etl/comercial/faturamento-tributos` | `bi_faturamento` |

Mantém `tipo_comando='FUNCAO'`, `estrategia_carga='REPLACE_PERIODO'`, ordens 2/4/5 e `ativa` como está (a tarefa `ATU_COMERCIAL` executa todas em sequência independentemente do flag `ativa`, e força `APPEND` conforme spec do backend).

### Backend

Spec em `docs/backend-etl-central.md` já cobre esses endpoints (rotas individuais opcionais via `/api/etl/acoes/{id}/executar`); o registro dos endpoints no Cloud é apenas informativo/UI e para execução individual futura. Nenhuma mudança de código frontend.

### Fora de escopo

- Frontend (a grade já lê `endpoint_api`/`tabela_destino` dos registros)
- Código FastAPI (sem acesso)
- Alterar `ativa` das 3 ações