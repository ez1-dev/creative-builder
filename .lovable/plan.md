## Causa

O endpoint `GET /api/bi/contabilidade/dre` (FastAPI) lê 4 tabelas no Cloud — `bi_vm_orc_dre`, `bi_vm_lanc_contabil`, `bi_dre_estrutura`, `bi_dre_mascara` — e a `BalancoPatrimonialPage` consome dados de `bi_etl_v_balanco_patrimonial`. **Nenhuma dessas tabelas existe** ainda no banco. PostgREST então responde `PGRST205 / 404` para qualquer GET nelas (caso do `bi_dre_estrutura` que você viu).

As 3 tabelas de fato (`bi_vm_orc_dre`, `bi_vm_lanc_contabil`, `bi_etl_v_balanco_patrimonial`) são populadas pelo ETL (`ATU_CONTABILIDADE`), e as 2 dimensionais (`bi_dre_estrutura`, `bi_dre_mascara`) são tabelas de configuração mantidas manualmente.

## Plano (1 migration)

Criar as 5 tabelas no schema `public`, com:

- Colunas padronizadas em minúsculo (compatível com `normalizar_rows_supabase` documentado em `docs/backend-etl-normalizacao-rows.md`).
- `id uuid pk default gen_random_uuid()`, `created_at`/`updated_at`.
- Índice em `(cd_empresa, anomes_referente)` para as tabelas de fato.
- Coluna `extras jsonb` para campos que o ERP possa enviar fora do esquema mínimo (evita novo erro "Nenhuma coluna válida encontrada").
- `GRANT SELECT ON ... TO authenticated`, `GRANT ALL ... TO service_role` (ETL e endpoints contábeis rodam com service role; UI lê via FastAPI, não direto).
- `ENABLE RLS` + policy `SELECT` apenas para `authenticated` (somente admin via `is_admin(auth.uid())` para `bi_dre_estrutura` e `bi_dre_mascara`, que podem ser editáveis no futuro).

### Esquema proposto

```text
bi_vm_orc_dre
  cd_empresa int, cd_filial int, anomes_referente int,
  mascara text, descricao_linha text, unidade_negocio text,
  centro_custo text, vl_orcado numeric(18,2), extras jsonb

bi_vm_lanc_contabil
  cd_empresa int, cd_filial int, anomes_referente int,
  cd_conta text, mascara text, centro_custo text,
  unidade_negocio text, vl_debito numeric(18,2),
  vl_credito numeric(18,2), vl_saldo numeric(18,2), extras jsonb

bi_etl_v_balanco_patrimonial
  cd_empresa int, cd_filial int, anomes_referente int,
  cd_conta text, mascara text, descricao_conta text,
  grupo text, vl_saldo numeric(18,2), extras jsonb

bi_dre_estrutura  (configuração)
  ordem int, mascara text unique, descricao text,
  totalizadora bool, sinal smallint, nivel smallint, ativo bool

bi_dre_mascara    (de→para conta→máscara DRE)
  cd_conta text, mascara text, unidade_negocio text,
  unique (cd_conta, coalesce(unidade_negocio,''))
```

## O que NÃO faço

- Não popular dados (será via ETL `ATU_CONTABILIDADE`).
- Não tocar no FastAPI nem nas páginas existentes (`DrePage`, `BalancoPatrimonialPage`).
- Não alterar `src/integrations/supabase/{client,types}.ts` (auto-gerado).

## Confirmação

Os campos exatos de `bi_dre_estrutura` e `bi_dre_mascara` dependem de como o backend FastAPI espera ler. O esquema acima é o mínimo razoável; se você tiver o DDL oficial do backend, me envie para eu usar literalmente.
