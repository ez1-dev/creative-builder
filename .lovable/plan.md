## Diagnóstico

`bi_faturamento` **não tem** a coluna `fonte_acao` hoje. Esse campo identifica qual ação do ETL carregou a linha (ex.: `faturamento`, `faturamento-manual`, `faturamento-contabil`, `faturamento-tributos`) e precisa existir no Cloud antes do frontend mostrar.

## Mudanças

### 1. Migration (Cloud)
```sql
ALTER TABLE public.bi_faturamento
  ADD COLUMN IF NOT EXISTS fonte_acao text;

CREATE INDEX IF NOT EXISTS bi_faturamento_fonte_acao_idx
  ON public.bi_faturamento (fonte_acao);
```
Sem default — linhas antigas ficam `NULL` e serão exibidas como `"SEM_FONTE"` no frontend. Backfill fica a cargo do ETL na próxima carga.

### 2. Backend FastAPI (spec — `docs/backend-bi-faturamento-validacao.md`)
Atualizar o documento com:
- Novo filtro opcional `fonte_acao` (csv, ex.: `fonte_acao=faturamento,faturamento-manual`). Quando o valor `SEM_FONTE` aparecer na lista, backend traduz para `IS NULL`.
- Resposta dos 4 endpoints inclui `fonte_acao`:
  - `por-movimento`: agrupar por `anomes_emissao, fonte_acao, cd_tp_movimento, cd_origem`.
  - `detalhes`: incluir coluna `fonte_acao`.
  - `resumo` e `por-tns`: sem mudança (não pediram).
- ETL (`POST /api/etl/comercial/faturamento*`) deve preencher `fonte_acao` com o `id_acao` da ação em execução durante o upsert em `bi_faturamento`.

### 3. Frontend
**`src/lib/bi/faturamentoValidacao.ts`**
- `FaturamentoValidacaoFiltros`: adicionar `fonte_acao?: string`.
- `PorMovimentoRow`: adicionar `fonte_acao: string | null`.
- `DetalheRow`: adicionar `fonte_acao: string | null`.
- `toParams`: encaminhar `fonte_acao`.

**`src/pages/bi/FaturamentoValidacaoPage.tsx`**
- Adicionar campo de filtro "Fonte Ação" no grid de filtros.
- Adicionar coluna `fonte_acao` na tabela de detalhes (após `cd_centro_custos_3`).
- Adicionar coluna `fonte_acao` na tabela "Resumo por movimento" (após `anomes_emissao`).
- Helper local: render `r.fonte_acao ?? 'SEM_FONTE'`.
- Incluir `fonte_acao` no header e nas linhas do CSV exportado.

### 4. Documentação
Atualizar `docs/backend-bi-faturamento-validacao.md` conforme item 2.

## Fora de escopo
- Não alterar `por-tns` nem `resumo` (não solicitados).
- Não fazer backfill de `fonte_acao` em linhas históricas — fica para o backend decidir.
- Sem mudanças no Genius, ETL central, ou outras telas BI.

## Verificação
- Migration aplicada: `select column_name from information_schema.columns where table_name='bi_faturamento' and column_name='fonte_acao'` retorna 1 linha.
- Tela carrega: linhas antigas mostram `"SEM_FONTE"`; filtro por fonte aceita csv e funciona após backend implementar.
- Export CSV inclui a nova coluna.
