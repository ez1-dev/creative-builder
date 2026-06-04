## Objetivo

Separar a tela `/bi/faturamento-validacao` em duas abas distintas para evitar confusão entre a visão comercial (comparar com BI UpQuery) e a visão técnica (auditoria por fonte ETL).

## Estrutura proposta

A tela ganha um `DashboardTabs` com 3 abas:

1. **Resumo geral** (mantém o conteúdo atual: KPIs, "Resumo por movimento", "Resumo por TNS", "Detalhes" — sem alteração).
2. **Comercial por Unidade** — nova.
3. **Técnico / Conciliação** — nova (substitui visualmente o "Resumo por movimento" quando o usuário quer auditar por fonte).

Os filtros globais existentes (incluindo `fonte_acao`) continuam no topo e alimentam todas as abas.

## Aba 1 — Comercial por Unidade

**Endpoint backend (FastAPI)**: `GET /api/bi/faturamento/unidade-comercial`

**RPC Cloud (Supabase)**: `public.bi_faturamento_unidade_comercial(anomes_ini, anomes_fim, unidade_negocio, fonte_acao)`

Regras:
- Filtra `fonte_acao IN ('VM_FATURAMENTO', 'VM_FATURAMENTO_MANUAL')` — sempre, mesmo se o usuário não filtrar. Outras fontes são ignoradas porque não trazem `cd_prj`.
- Deriva `unidade_negocio`:
  - `cd_prj = '12'` → `'GENIUS'`
  - demais → `'ESTRUTURAL ZORTEA'`
- Agrupa por `anomes_emissao, unidade_negocio`.
- Inclui linha extra `unidade_negocio = 'CONSOLIDADO'` por `anomes_emissao` (soma das duas unidades).
- Aplica filtro opcional `unidade_negocio` (CSV) no resultado final, permitindo o usuário restringir a `GENIUS,ESTRUTURAL ZORTEA,CONSOLIDADO`.

Colunas retornadas: `anomes_emissao, unidade_negocio, qtd_linhas, vl_bruto, vl_total, vl_devolucao, vl_icms, vl_pis, vl_cofins`.

Render: tabela `DataTableBI` com a coluna `unidade_negocio` destacada; linha `CONSOLIDADO` em negrito (via `rowClassName`).

## Aba 2 — Técnico / Conciliação por Fonte

**Endpoint backend**: `GET /api/bi/faturamento/unidade-tecnica`

**RPC Cloud**: `public.bi_faturamento_unidade_tecnica(anomes_ini, anomes_fim, unidade_negocio, fonte_acao)`

Regras:
- Usa todas as fontes (`VM_FATURAMENTO`, `VM_FATURAMENTO_MANUAL`, `VM_FAT_CONTABIL`, `VM_FAT_TRB`).
- Deriva `unidade_negocio` com a mesma regra de `cd_prj`. Para fontes sem `cd_prj` (contábil/tributos), `unidade_negocio = 'SEM_UNIDADE'` em vez de cair em ESTRUTURAL ZORTEA — isso evita poluir a visão comercial e deixa explícito ao auditor.
- Agrupa por `anomes_emissao, unidade_negocio, fonte_acao, cd_tp_movimento, cd_origem`.
- Aplica filtros opcionais: `anomes_ini`, `anomes_fim`, `unidade_negocio` (CSV), `fonte_acao` (CSV, com `SEM_FONTE` → `IS NULL`).

Colunas retornadas: `anomes_emissao, unidade_negocio, fonte_acao, cd_tp_movimento, cd_origem, qtd_linhas, vl_bruto, vl_total, vl_devolucao, vl_icms, vl_pis, vl_cofins`.

Render: tabela `DataTableBI`. Render de `null`: `fonte_acao → 'SEM_FONTE'`, demais → `'-'`.

## Filtros

Adicionar filtro `unidade_negocio` (texto CSV, ex.: `GENIUS,ESTRUTURAL ZORTEA`) no grid de filtros — usado apenas pelas duas novas abas.

## Mudanças por arquivo

**Migration (Cloud)** — criar duas RPCs `SECURITY DEFINER`, lendo apenas `bi_faturamento`. `GRANT EXECUTE TO authenticated`.

**`docs/backend-bi-faturamento-validacao.md`** — documentar os dois novos endpoints, parâmetros, regras de unidade, e deixar explícito que contábil/tributos não entram na visão comercial.

**`src/lib/bi/faturamentoValidacao.ts`** — adicionar:
- `unidade_negocio` em `FaturamentoValidacaoFiltros` + `toParams`.
- Tipos `UnidadeComercialRow`, `UnidadeTecnicaRow`.
- Funções `getUnidadeComercial(f)` e `getUnidadeTecnica(f)`.

**`src/pages/bi/FaturamentoValidacaoPage.tsx`** — refatorar para:
- Envolver as 4 seções existentes em `DashboardTabs` (aba "Resumo geral").
- Adicionar aba "Comercial por Unidade" com `useQuery` + `DataTableBI`.
- Adicionar aba "Técnico / Conciliação" com `useQuery` + `DataTableBI`.
- Adicionar campo `unidade_negocio` no grid de filtros.
- Estender `atualizar()` para refetch das duas novas queries.
- CSV export permanece restrito à aba de Detalhes (escopo atual).

## Verificação

1. Migration aplicada; `SELECT * FROM public.bi_faturamento_unidade_comercial('202601','202612',NULL,NULL) LIMIT 5` retorna linhas com `CONSOLIDADO`.
2. Tela carrega com 3 abas; trocar de aba não recarrega filtros.
3. Soma `vl_total` de `GENIUS + ESTRUTURAL ZORTEA` por `anomes_emissao` = linha `CONSOLIDADO` correspondente.
4. Aba técnica mostra `SEM_UNIDADE` para linhas oriundas de `VM_FAT_CONTABIL`/`VM_FAT_TRB`.
5. Filtro `unidade_negocio=GENIUS` restringe corretamente nas duas novas abas.

## Pontos a confirmar (antes de implementar)

- OK derivar `unidade_negocio = 'SEM_UNIDADE'` na aba técnica para fontes sem `cd_prj`, ou prefere `'ESTRUTURAL ZORTEA'` também na técnica?
- A linha `CONSOLIDADO` deve aparecer também por **total geral** (sem `anomes_emissao`) além de por mês, ou só por mês?
