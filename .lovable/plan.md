## Objetivo

Corrigir `docs/backend-bi-contabilidade-dre-matriz.md` para refletir o schema real de `public.bi_vm_lanc_contabil` no Postgres do FastAPI. A versão anterior assumia `cd_conta` + `centro_custo` + campos dentro de `extras` jsonb, o que está incorreto e provavelmente é a causa do 502.

## Schema real (FastAPI)

`public.bi_vm_lanc_contabil` possui as colunas diretas:

- `cd_mascara`
- `cd_centro_custos`
- `cd_centro_custos_3`
- `cd_origem_lcto`
- `cd_tns`
- `vl_realizado`
- `anomes_referente`
- (mantém `unidade_negocio` para o filtro de unidade)

**Não usar mais:** `cd_conta`, `centro_custo`, `extras->>'cd_origem_lcto'`, `extras->>'cd_tns'`, `vl_debito`/`vl_credito`/`vl_saldo`, e o LEFT JOIN com `bi_dre_mascara` para resolver `mascara` (a máscara já vem direto no lançamento).

## Mudanças no documento

1. **Seção "Fontes de dados"** — remover `bi_dre_mascara` do passo de classificação (a máscara está em `l.cd_mascara`). Manter `bi_dre_mascara` apenas como tabela de referência opcional (descrição/ordem) se ainda usada pela estrutura; caso contrário remover.
2. **Remover a subseção "Campos auxiliares lidos de extras"** inteira.
3. **Classificação via `bi_dre_regras`** — atualizar os predicados do LATERAL:
   - `r.cd_mascara_like        IS NULL OR l.cd_mascara        LIKE r.cd_mascara_like`
   - `r.cd_centro_custos_3     IS NULL OR l.cd_centro_custos_3 =    r.cd_centro_custos_3`
   - `r.cd_centro_custos_like  IS NULL OR l.cd_centro_custos   LIKE r.cd_centro_custos_like`
   - `r.cd_origem_lcto         IS NULL OR l.cd_origem_lcto     =    r.cd_origem_lcto`
   - `r.cd_tns_like            IS NULL OR l.cd_tns             LIKE r.cd_tns_like`
   - `ORDER BY r.prioridade ASC, r.id LIMIT 1` (inalterado)
4. **Fallback** — `codigo_linha_efetivo := COALESCE(r.codigo_linha, l.cd_mascara)` (sem JOIN com `bi_dre_mascara`).
5. **Agregação** — `SUM(COALESCE(l.vl_realizado, 0))` por `codigo_linha_efetivo` × `(anomes_referente % 100)`. Filtro do ano: `anomes_referente / 100 = :ano`. Filtro de unidade permanece via `l.unidade_negocio`.
6. **SQL de referência** — reescrever o bloco WITH `lanc` substituindo o JOIN com `bi_dre_mascara`, removendo referências a `extras`, e usando `vl_realizado` direto.
7. **Orçamento** (`bi_vm_orc_dre`) e contrato HTTP de resposta — **inalterados**.
8. **Proibições** — reforçar: não usar `cd_conta`, `centro_custo`, `extras->>...`, Oracle/UpQuery, `EZORTEA.V_DRE_V1`, nem regra fixa por `cd_mascara` no Python.

## Arquivo alterado

- `docs/backend-bi-contabilidade-dre-matriz.md` (apenas documentação; nenhum código frontend muda — o contrato da resposta é preservado).

## Fora de escopo

- Tabela do Cloud `public.bi_vm_lanc_contabil` (schema diferente, com `cd_conta`/`mascara`/`extras`) — não é usada por este endpoint e não será alterada.
- Frontend `DrePage.tsx` — sem mudanças.
