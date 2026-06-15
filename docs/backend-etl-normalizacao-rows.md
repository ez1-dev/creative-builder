# Backend ETL — Normalização lowercase antes de `etl_carga_periodo`

Aplica-se a **toda** chamada `supabase.rpc("etl_carga_periodo", ...)` no FastAPI.

## Problema

Ao executar `ETL_V_BALANCO_PATRIMONIAL` (e qualquer outra ação que grava em `bi_*` via `etl_carga_periodo`), o Cloud retorna:

```
Nenhuma coluna válida encontrada entre p_rows e public.bi_etl_v_balanco_patrimonial
```

### Causa

- O ERP Senior devolve aliases em **CAIXA ALTA** (`ANOMES_REFERENTE`, `CD_EMPRESA`, `VL_SALDO`, ...).
- As colunas reais das tabelas `public.bi_*` no Cloud estão **em minúsculo** (`anomes_referente`, `cd_empresa`, `vl_saldo`, ...).
- A RPC `etl_carga_periodo` compara chave a chave (case-sensitive). Como nenhuma chave bate, ela descarta tudo e responde "nenhuma coluna válida".

Vale para `VM_ORC_DRE`, `VM_LANC_CONTABIL`, `ETL_V_BALANCO_PATRIMONIAL` e qualquer ação futura que use o mesmo executor.

## Correção obrigatória

### 1. Função utilitária

Adicionar no módulo de ETL (ex.: `app/etl/utils.py`):

```python
def normalizar_rows_supabase(rows: list[dict]) -> list[dict]:
    """Converte todas as chaves de cada row para lowercase antes de enviar à RPC etl_carga_periodo.

    O ERP Senior devolve aliases em CAIXA ALTA; as tabelas bi_* no Cloud têm colunas em minúsculo.
    Sem essa normalização a RPC responde:
      "Nenhuma coluna válida encontrada entre p_rows e public.<tabela>".
    """
    if not rows:
        return rows
    return [
        {(k.lower() if isinstance(k, str) else k): v for k, v in row.items()}
        for row in rows
    ]
```

### 2. Aplicar antes de TODA chamada à RPC

```python
from app.etl.utils import normalizar_rows_supabase

rows = normalizar_rows_supabase(rows)

if rows:
    logger.info(
        "etl_carga_periodo tabela=%s rows[0]=%s keys=%s",
        tabela_destino, rows[0], list(rows[0].keys()),
    )

resp = supabase.rpc(
    "etl_carga_periodo",
    {
        "p_tabela": tabela_destino,
        "p_coluna_periodo": coluna_periodo,
        "p_anomes_ini": anomes_ini,
        "p_anomes_fim": anomes_fim,
        "p_rows": rows,
    },
).execute()
```

> O log com `rows[0]` e `list(rows[0].keys())` é **temporário** — deixar até validar em produção e remover na próxima passagem.

### 3. Checklist de aplicação

A normalização deve estar ativa em todas as ações que chamam `etl_carga_periodo`:

- [ ] `VM_ORC_DRE` → `bi_vm_orc_dre`
- [ ] `VM_LANC_CONTABIL` → `bi_vm_lanc_contabil`
- [ ] `ETL_V_BALANCO_PATRIMONIAL` → `bi_etl_v_balanco_patrimonial`
- [ ] Qualquer outra ação cuja `tabela_destino` esteja em `public.bi_*`.

## Smoke test

```bash
BASE="https://<fastapi>"
TOKEN="<jwt>"

curl -sS -X POST "$BASE/api/etl/acoes/ETL_V_BALANCO_PATRIMONIAL/executar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "ngrok-skip-browser-warning: true" \
  -H "Content-Type: application/json" \
  -d '{"anomes_ini":202601,"anomes_fim":202601,"acionado_por":"SMOKE"}'
```

Esperado:

- HTTP 200 com `execucao_id`.
- Em `etl_execucoes` / `etl_acao_execucoes`: `status=CONCLUIDA` e `total_linhas > 0`.
- Mensagem "Nenhuma coluna válida encontrada…" **não** deve mais aparecer em `etl_logs`.

## Regras correlatas no resolver de ação

Ver [`docs/backend-etl-central.md` › "Resolução de `{acao_ref}`"](./backend-etl-central.md). Em resumo:

- **Não existe** `etl_acoes.codigo_acao`. Identificador textual é `id_acao` (TEXT).
- `id_acao` é texto — comparar sempre `upper(id_acao) = upper(:ref)`, nunca como bigint.
- `id` é uuid — só casar quando `ref` for um UUID válido.
- Ao ler atributos da ação, usar `acao.get("estrategia")` (fallback `acao.get("estrategia_carga")`). **Nunca** `acao.get("metodo_carga")` — esse campo não existe no schema atual.
