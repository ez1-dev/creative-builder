# Backend FastAPI — Drill-down e Exceções da DRE

Endpoint **novo**, sem alterar `/api/bi/contabilidade/dre-matriz` nem `bi_dre_regras` /
`bi_dre_mascara` / `bi_dre_estrutura`.

> **⚠️ Valores aceitos para `tipo_drill` (padronização frontend):**
> `CENTRO_CUSTOS`, `CONTA_CONTABIL`, `HISTORICO`, `LANCAMENTO`, `ORIGEM`,
> `TRANSACAO`, `UNIDADE`, `REABRIR`. Os antigos `CENTRO_CUSTO` (sem S) e
> `CONTA` foram renomeados — a RPC `bi_dre_drill_realizado` precisa mapear os
> novos nomes (`CENTRO_CUSTOS` → group by `cd_cencus`, `CONTA_CONTABIL` →
> group by `cd_conta`). Qualquer outro valor (label, `undefined`, `null`) é
> sanitizado no frontend para `CONTA_CONTABIL`.


## 0. Correção PGRST203 — assinatura única da RPC

O PostgREST retorna `PGRST203` quando existem dois overloads de `public.bi_dre_drill_realizado`. Manter **apenas uma** assinatura, com 6 parâmetros `text`, e recarregar o cache do PostgREST:

```sql
-- Remove a versão antiga (5 parâmetros) que causa o conflito
DROP FUNCTION IF EXISTS public.bi_dre_drill_realizado(text, text, text, text, text);

-- Recria garantindo a assinatura canônica de 6 parâmetros
CREATE OR REPLACE FUNCTION public.bi_dre_drill_realizado(
  p_anomes_ini       text,
  p_anomes_fim       text,
  p_codigo_linha     text,
  p_tipo_drill       text,
  p_anomes_referente text,
  p_unidade_negocio  text
) RETURNS TABLE (...) AS $$ ... $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Forçar recarga do schema no PostgREST
NOTIFY pgrst, 'reload schema';
```

Regras permanentes:

- A RPC tem **uma única assinatura**. Mudanças futuras usam `CREATE OR REPLACE` mantendo a mesma lista de parâmetros, ou seguem o ciclo `DROP FUNCTION ... ; CREATE ...`. Nunca criar overloads.
- O endpoint FastAPI sempre passa os 6 parâmetros — `p_anomes_referente` e `p_unidade_negocio` podem ser `NULL`, e a função trata.
- O frontend envia `anomes_referente=''` e `unidade=''` quando não houver valor; o FastAPI converte `''` → `None` antes de chamar a RPC.


## 1. Endpoint

```
GET /api/bi/contabilidade/dre-drill
  ?ano=2026
  &mes_ini=01
  &mes_fim=12
  &anomes_referente=202603        # opcional, presente em célula mensal
  &codigo_linha=RECEITA_BRUTA     # codigo_linha da DRE
  &tipo_drill=LANCAMENTO          # CENTRO_CUSTO|CONTA|ORIGEM|TRANSACAO|HISTORICO|LANCAMENTO|UNIDADE|REABRIR
  &unidade=GENIUS                 # vazio = TODOS
```

> `tipo_drill=REABRIR` **não** é chamado pelo frontend nesta rota — o frontend
> chama `tipo_drill=CONTA` (apenas para somar) para cada componente da fórmula.

### Resposta padrão

```json
{
  "tipo_drill": "CENTRO_CUSTO",
  "codigo_linha": "RECEITA_BRUTA",
  "periodo": { "ano": 2026, "mes_ini": "01", "mes_fim": "12", "anomes_referente": null },
  "unidade": "GENIUS",
  "columns": [
    { "key": "chave", "label": "Centro de Custos", "format": "text" },
    { "key": "descricao", "label": "Descrição", "format": "text" },
    { "key": "vl_realizado", "label": "Realizado", "format": "currency" }
  ],
  "rows": [
    { "chave": "001", "descricao": "Matriz", "vl_realizado": 123456.78 }
  ],
  "total": 123456.78
}
```

### Para `tipo_drill=LANCAMENTO`

Retornar **uma linha por lançamento** com todos os campos abaixo (o frontend usa
para abrir o modal de exceção):

```
nr_lancamento, nr_lote, nr_documento,
cd_conta, cd_cencus, cd_origem, cd_transacao, ds_historico,
anomes_referente, vl_realizado, descricao
```

Colunas sugeridas:

```json
[
  {"key":"nr_lancamento","label":"Lançamento","format":"text"},
  {"key":"nr_documento","label":"Documento","format":"text"},
  {"key":"cd_transacao","label":"TNS","format":"text"},
  {"key":"cd_cencus","label":"CC","format":"text"},
  {"key":"cd_conta","label":"Conta","format":"text"},
  {"key":"ds_historico","label":"Histórico","format":"text"},
  {"key":"anomes_referente","label":"Período","format":"text"},
  {"key":"vl_realizado","label":"Valor","format":"currency"}
]
```

## 2. Implementação do endpoint

```python
import traceback
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

SQL = """
SELECT *
FROM public.bi_dre_drill_realizado(
  %(p_ano)s, %(p_mes_ini)s, %(p_mes_fim)s,
  %(p_codigo_linha)s, %(p_tipo_drill)s,
  %(p_unidade)s, %(p_anomes_referente)s
)
"""

def _to_float(x):
    if isinstance(x, Decimal):
        return float(x)
    return x

@router.get("/api/bi/contabilidade/dre-drill")
def dre_drill(
    ano: int = Query(...),
    mes_ini: str = Query(...),
    mes_fim: str = Query(...),
    codigo_linha: str = Query(...),
    tipo_drill: str = Query(...),
    unidade: str | None = Query(None),
    anomes_referente: str | None = Query(None),
):
    try:
        rows = pg.fetch(SQL, {
            "p_ano": ano,
            "p_mes_ini": mes_ini,
            "p_mes_fim": mes_fim,
            "p_codigo_linha": codigo_linha,
            "p_tipo_drill": tipo_drill,
            "p_unidade": (unidade or None),
            "p_anomes_referente": (anomes_referente or None),
        })
        rows = [{k: _to_float(v) for k, v in r.items()} for r in rows]
        return {
            "tipo_drill": tipo_drill,
            "codigo_linha": codigo_linha,
            "periodo": {
                "ano": ano, "mes_ini": mes_ini, "mes_fim": mes_fim,
                "anomes_referente": anomes_referente,
            },
            "unidade": unidade,
            "columns": _columns_for(tipo_drill),
            "rows": rows,
            "total": sum((r.get("vl_realizado") or 0) for r in rows),
        }
    except Exception as e:
        print("[ERRO DRE DRILL]", repr(e))
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(e))
```

CORS e header `ngrok-skip-browser-warning` iguais aos outros `/api/bi/*`.

## 3. RPC `public.bi_dre_drill_realizado` (a criar no Postgres)

Assinatura:

```sql
CREATE OR REPLACE FUNCTION public.bi_dre_drill_realizado(
  p_ano              int,
  p_mes_ini          text,
  p_mes_fim          text,
  p_codigo_linha     text,
  p_tipo_drill       text,
  p_unidade          text DEFAULT NULL,
  p_anomes_referente text DEFAULT NULL
)
RETURNS TABLE (
  chave            text,
  descricao        text,
  vl_realizado     numeric,
  -- campos extras (preenchidos só em LANCAMENTO):
  nr_lancamento    text,
  nr_lote          text,
  nr_documento     text,
  cd_conta         text,
  cd_cencus        text,
  cd_origem        text,
  cd_transacao     text,
  ds_historico     text,
  anomes_referente int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
...
$$;
```

### Lógica (mesma classificação da DRE)

```sql
WITH base AS (
  SELECT
    l.*,
    reg.codigo_linha AS codigo_linha_regra,
    COALESCE(reg.sinal, 1) AS sinal,
    -- aplica EXCEÇÃO por lançamento × linha
    COALESCE(e.codigo_linha_destino, reg.codigo_linha) AS codigo_linha_efetivo
  FROM public.bi_vm_lanc_contabil l
  LEFT JOIN LATERAL (
    SELECT r.codigo_linha, r.prioridade, r.sinal
    FROM public.bi_dre_regras r
    WHERE <l casa em r>          -- mesma condição usada hoje
    ORDER BY r.prioridade
    LIMIT 1
  ) reg ON TRUE
  LEFT JOIN public.bi_dre_excecoes e
    ON e.ativo
   AND e.nr_lancamento     = l.nr_lancamento
   AND e.codigo_linha_origem = reg.codigo_linha
  WHERE (l.anomes_referente / 100)            = p_ano
    AND (l.anomes_referente % 100)::int BETWEEN p_mes_ini::int AND p_mes_fim::int
    AND (p_anomes_referente IS NULL OR l.anomes_referente = p_anomes_referente::int)
    AND (p_unidade IS NULL OR p_unidade = '' OR <l.unidade> = p_unidade)
)
SELECT ...
FROM base
WHERE codigo_linha_efetivo = p_codigo_linha
GROUP BY ... -- conforme p_tipo_drill
```

Valor:

```sql
SUM(COALESCE(l.vl_saldo, COALESCE(l.vl_credito,0) - COALESCE(l.vl_debito,0))) * sinal
```

Agrupamento por `p_tipo_drill`:

| tipo_drill        | GROUP BY               | chave / descricao                |
| ----------------- | ---------------------- | -------------------------------- |
| `CENTRO_CUSTO`    | `l.cd_cencus`          | código + descrição do CC         |
| `CONTA`           | `l.cd_conta`           | `cd_conta` + descrição da conta  |
| `ORIGEM`          | `l.cd_origem`          | código + descrição               |
| `TRANSACAO`       | `l.cd_transacao`       | TNS + descrição                  |
| `HISTORICO`       | `l.ds_historico`       | texto                            |
| `LANCAMENTO`      | (sem agregação)        | `nr_lancamento` + todos os campos extras |
| `UNIDADE`         | unidade de negócio     | sigla                            |

> **Não** usar `bi_dre_mascara`. **Não** alterar `bi_dre_regras`. Os nomes
> exatos das colunas de `bi_vm_lanc_contabil` ficam a confirmar pelo backend.

## 4. RPC `bi_dre_realizado_regras` (existente — usada pelo `/dre-matriz`)

Aplicar **o mesmo `LEFT JOIN public.bi_dre_excecoes e`** com
`e.ativo AND e.nr_lancamento = l.nr_lancamento AND e.codigo_linha_origem = reg.codigo_linha`
e usar `COALESCE(e.codigo_linha_destino, reg.codigo_linha)` como linha
efetiva. Assim a matriz e o drill ficam consistentes após cada exceção.

## 5. Linhas calculadas (frontend cuida do `REABRIR`)

O frontend chama o endpoint múltiplas vezes — uma por componente — para montar
o card de "Reabrir". O backend **não** precisa tratar `tipo_drill=REABRIR`.

Fórmulas (também em `src/lib/bi/dreReabrir.ts`):

```
RECEITA_LIQUIDA       = RECEITA_BRUTA + DEDUCOES_VENDAS
CUSTO_TOTAL           = CUSTO_PRODUCAO_VENDA + CUSTO_MEX
LUCRO_BRUTO           = RECEITA_LIQUIDA + CUSTO_TOTAL
EBITDA                = LUCRO_BRUTO + DESPESAS_COMERCIAIS + DESPESAS_ADMINISTRATIVAS
EBIT                  = EBITDA + DEPRECIACAO
RESULTADO_EXERCICIO   = EBIT + RECEITAS_FINANCEIRAS + DESPESAS_FINANCEIRAS
                          + RECEITAS_NAO_OPERACIONAIS + DESPESAS_NAO_OPERACIONAIS + FAZENDA
```

## 6. Tabela `public.bi_dre_excecoes` (já criada no Lovable Cloud)

```
id (uuid)
nr_lancamento (text, NOT NULL)
nr_lote, nr_documento, cd_conta, cd_cencus, cd_origem, cd_transacao, ds_historico (text)
anomes_referente (int)
vl_realizado (numeric)
codigo_linha_origem  (text, NOT NULL)
codigo_linha_destino (text, NOT NULL, default 'NAO_CLASSIFICADO')
motivo (text, NOT NULL)
ativo (bool, default true)
criado_por (uuid -> auth.users)
criado_em / atualizado_em (timestamptz)
UNIQUE (nr_lancamento, codigo_linha_origem)
```

> **Importante:** correção de divergência com a UpQuery é sempre por exceção
> de lançamento. **Não** criar regra geral por TNS; outras ocorrências das
> mesmas TNS (`1-5101S`, `1-6101S`, `1-6933S`, `1-1201E`, `1-2201`) podem ser
> válidas em outros documentos e devem continuar classificadas pela regra
> normal.
