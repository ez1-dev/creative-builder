## Contexto

A tela `DrePage.tsx` já consome `GET /api/bi/contabilidade/dre-matriz` no FastAPI (via ngrok). A RPC `public.bi_dre_matriz_anual` no Cloud é apenas um espelho legado e **não precisa mudar** — a regra nova vive no FastAPI, onde também já existe `public.bi_dre_regras`.

Logo, esta alteração é **puramente de backend FastAPI + documentação**. Nada muda no frontend nem no schema do Cloud.

## O que vou entregar

Atualizar `docs/backend-bi-contabilidade-dre-matriz.md` com a nova especificação do endpoint para o time de backend implementar:

1. **Fonte do realizado** — `public.bi_vm_lanc_contabil` (campos auxiliares vêm de `extras` jsonb: `cd_origem_lcto`, `cd_tns`, `cd_centro_custos`; `centro_custo` direto da coluna; máscara da conta resolvida em `bi_dre_mascara` apenas como fallback).
2. **Classificação por `public.bi_dre_regras`** via `LEFT JOIN LATERAL`:
   - Match por (em qualquer combinação preenchida na regra):
     - `cd_mascara_like` → `m.mascara LIKE regra.cd_mascara_like`
     - `cd_centro_custos_3` → `left(l.centro_custo,3) = regra.cd_centro_custos_3`
     - `cd_centro_custos_like` → `l.centro_custo LIKE regra.cd_centro_custos_like`
     - `cd_origem_lcto` → `l.extras->>'cd_origem_lcto' = regra.cd_origem_lcto`
     - `cd_tns_like` → `l.extras->>'cd_tns' LIKE regra.cd_tns_like`
   - Filtro `regra.ativo = true`
   - `ORDER BY regra.prioridade ASC, regra.id` + `LIMIT 1` → primeira regra vence.
3. **Fallback** — se nenhuma regra casar, usar a máscara atual de `bi_dre_mascara` (comportamento atual preservado).
4. **Agregação** — somar `vl_saldo` (ou `vl_credito - vl_debito`) por `codigo_linha` (vindo da regra ou fallback) e `anomes_referente`, depois pivotar por mês como hoje.
5. **Orçamento** — continua de `public.bi_vm_orc_dre` por `mascara` × mês (inalterado).
6. **Proibições** — não usar Oracle/UpQuery, não consultar `EZORTEA.V_DRE_V1`, não manter regra fixa por `cd_mascara` no código Python.
7. **Contrato HTTP** — request/response permanecem idênticos (mesmo shape de linhas, mesmos query params `ano`/`unidade`).

## Pseudocódigo SQL (para o doc)

```sql
WITH lanc AS (
  SELECT
    COALESCE(r.codigo_linha, m.mascara) AS codigo_linha,
    (l.anomes_referente % 100)::int     AS mes,
    SUM(COALESCE(l.vl_saldo,
                 COALESCE(l.vl_credito,0) - COALESCE(l.vl_debito,0))) AS valor
  FROM public.bi_vm_lanc_contabil l
  LEFT JOIN public.bi_dre_mascara m ON m.cd_conta = l.cd_conta
  LEFT JOIN LATERAL (
    SELECT r.codigo_linha
    FROM public.bi_dre_regras r
    WHERE r.ativo
      AND (r.cd_mascara_like        IS NULL OR m.mascara                 LIKE r.cd_mascara_like)
      AND (r.cd_centro_custos_3     IS NULL OR left(l.centro_custo,3)    =    r.cd_centro_custos_3)
      AND (r.cd_centro_custos_like  IS NULL OR l.centro_custo            LIKE r.cd_centro_custos_like)
      AND (r.cd_origem_lcto         IS NULL OR l.extras->>'cd_origem_lcto' =  r.cd_origem_lcto)
      AND (r.cd_tns_like            IS NULL OR l.extras->>'cd_tns'       LIKE r.cd_tns_like)
    ORDER BY r.prioridade ASC, r.id
    LIMIT 1
  ) r ON true
  WHERE (l.anomes_referente / 100)::int = :ano
    AND (:unidade IS NULL OR m.unidade_negocio IS NULL OR m.unidade_negocio = :unidade)
  GROUP BY 1, 2
)
SELECT ... -- pivot + join com bi_vm_orc_dre, igual ao formato atual
```

## Fora do escopo

- RPC `public.bi_dre_matriz_anual` no Cloud (não é mais usada pela tela).
- Frontend `DrePage.tsx` (contrato preservado).
- ETL — assume-se que `bi_dre_regras` já está populada e mantida no FastAPI/origem.
