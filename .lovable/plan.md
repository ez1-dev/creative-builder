## Objetivo

Atualizar `docs/backend-bi-contabilidade-dre-matriz.md` para refletir a lógica **validada diretamente no Postgres** e instruir o backend a instalar e usar a RPC `public.rpc_bi_dre_realizado_regras` (no Postgres do FastAPI, **não** no Cloud).

O 502 atual está no código do endpoint / RPC antiga, não na SQL — a SQL validada já produz os totais oficiais por linha.

## Mudanças no documento

1. **Nova seção "Valores validados (sanity check)"** — incluir a tabela oficial para conferência do endpoint:

   ```
   DEPRECIACAO                  -1.376.904,62
   DESPESAS_ADMINISTRATIVAS     -2.983.931,76
   DESPESAS_COMERCIAIS          -2.161.234,31
   DESPESAS_FINANCEIRAS           -421.513,13
   DESPESAS_NAO_OPERACIONAIS      -217.783,04
   FAZENDA                         -68.999,11
   RECEITAS_FINANCEIRAS          1.090.062,11
   RECEITAS_NAO_OPERACIONAIS     1.161.400,81
   ```

2. **Nova seção "RPC de referência (instalar no Postgres do FastAPI)"** — incluir o DDL exato fornecido pelo usuário, sem alterações:

   ```sql
   CREATE OR REPLACE FUNCTION public.rpc_bi_dre_realizado_regras(
       p_anomes_ini text,
       p_anomes_fim text
   )
   RETURNS TABLE (
       codigo_linha text,
       anomes_referente text,
       vl_realizado numeric
   )
   LANGUAGE sql
   STABLE
   AS $$
       WITH classificado AS (
           SELECT
               l.anomes_referente,
               r.codigo_linha,
               l.vl_realizado * COALESCE(r.sinal, 1) AS vl_realizado
           FROM public.bi_vm_lanc_contabil l
           LEFT JOIN LATERAL (
               SELECT r.*
               FROM public.bi_dre_regras r
               WHERE r.ativo = true
                 AND (r.cd_mascara_like IS NULL OR l.cd_mascara LIKE r.cd_mascara_like)
                 AND (r.cd_centro_custos_3 IS NULL OR l.cd_centro_custos_3 = r.cd_centro_custos_3)
                 AND (r.cd_centro_custos_like IS NULL OR l.cd_centro_custos LIKE r.cd_centro_custos_like)
                 AND (r.cd_origem_lcto IS NULL OR l.cd_origem_lcto = r.cd_origem_lcto)
                 AND (r.cd_tns_like IS NULL OR l.cd_tns LIKE r.cd_tns_like)
               ORDER BY r.prioridade
               LIMIT 1
           ) r ON true
           WHERE l.anomes_referente BETWEEN p_anomes_ini AND p_anomes_fim
       )
       SELECT
           c.codigo_linha,
           c.anomes_referente,
           ROUND(SUM(c.vl_realizado), 2) AS vl_realizado
       FROM classificado c
       WHERE c.codigo_linha IS NOT NULL
       GROUP BY
           c.codigo_linha,
           c.anomes_referente;
   $$;
   ```

   Observações:
   - Instalar **no Postgres do FastAPI** (mesmo cluster das tabelas `bi_*`), **não** no Lovable Cloud.
   - Parâmetros `p_anomes_ini`/`p_anomes_fim` são `text` no formato `YYYYMM` (ex.: `'202601'`, `'202612'`).
   - O `sinal` vem de `public.bi_dre_regras.sinal` (default 1).
   - Lançamentos sem regra casada são descartados (`WHERE c.codigo_linha IS NOT NULL`) — **substitui** o fallback anterior por `l.cd_mascara`.

3. **Substituir o "SQL de referência" inline** pelo uso da RPC e atualizar o pseudocódigo do endpoint:

   ```python
   @router.get("/api/bi/contabilidade/dre-matriz")
   def dre_matriz(ano: str, unidade: str | None = None):
       p_ini = f"{ano}01"
       p_fim = f"{ano}12"
       realizado = pg.fetch(
           "SELECT * FROM public.rpc_bi_dre_realizado_regras(%(ini)s, %(fim)s)",
           {"ini": p_ini, "fim": p_fim},
       )
       orcado = pg.fetch(SQL_ORCADO, {"ano": ano, "unidade": ...})
       # pivot mensal + join com public.bi_dre_estrutura + cálculo de A.V.
       return rows
   ```

   - Filtro de unidade: a RPC atual **não** recebe unidade. Documentar como TODO opcional (adicionar parâmetro `p_unidade text default null` posteriormente, filtrando por `l.unidade_negocio`). Por ora o endpoint aceita o param mas ignora.

4. **Reforçar a seção "Colunas usadas"** — manter a lista (`cd_mascara`, `cd_centro_custos`, `cd_centro_custos_3`, `cd_origem_lcto`, `cd_tns`, `vl_realizado`, `anomes_referente`) e a lista de proibições (`cd_conta`, `centro_custo`, `extras->>...`, `vl_debito`/`vl_credito`/`vl_saldo`, Oracle/UpQuery, `EZORTEA.V_DRE_V1`, regras fixas no Python).

5. **Diagnóstico do 502** — adicionar nota: a SQL/RPC foi validada manualmente e devolve os valores oficiais acima; se o endpoint retornar 502, o problema está no código Python do endpoint (ex.: ainda chamando uma RPC antiga que referenciava `cd_conta`/`extras`) e não no SQL. Reaplicar a RPC acima e reapontar o endpoint para ela resolve.

## Arquivo alterado

- `docs/backend-bi-contabilidade-dre-matriz.md` (apenas documentação).

## Fora de escopo

- Não criar essa RPC no Lovable Cloud — ela vive no Postgres do FastAPI.
- Frontend `DrePage.tsx` — contrato HTTP preservado, sem mudanças.
