## Contexto

O usuário quer reverter a decisão anterior (que removia `bi_produto` e fazia JOIN direto no ERP via FastAPI) e voltar à arquitetura de **dimensão sincronizada no Cloud** + enriquecimento na RPC `bi_comercial_drill` + ajustes na FastAPI + frontend.

Como BI Comercial hoje usa o endpoint REST `POST /api/bi/comercial/drill` do FastAPI (não uma RPC do Cloud), a parte de "ajustar RPC `public.bi_comercial_drill`" do spec descreve o caso em que o backend FastAPI executa SQL contra o Cloud. Vou tratar isso como **contrato para o backend FastAPI**, que é onde a query roda. No Cloud só preciso criar a tabela `bi_produto`. No frontend só preciso ajustar a renderização das colunas Produto/Descrição.

## Escopo deste plano

### 1. Cloud (migração)

Recriar `public.bi_produto` (foi dropada na rodada anterior):

```sql
create table if not exists public.bi_produto (
  cd_produto text primary key,
  ds_produto text,
  cd_familia text,
  cd_origem text,
  cd_unidade_medida text,
  tipo_item text,
  ativo boolean default true,
  atualizado_em timestamptz default now()
);
create index if not exists idx_bi_produto_ds_produto on public.bi_produto (ds_produto);

grant select on public.bi_produto to authenticated;
grant all on public.bi_produto to service_role;

alter table public.bi_produto enable row level security;

create policy "bi_produto leitura autenticada"
  on public.bi_produto for select to authenticated using (true);
```

Sem policy de escrita — só `service_role` (FastAPI) grava.

### 2. Frontend — `src/pages/bi/ComercialPage.tsx`

Restaurar o botão **"Sincronizar produtos"** (Sparkles) ao lado de "Sincronizar clientes", no header de admin. Chama `POST /api/bi/comercial/produtos/sincronizar` (mesmo padrão de `handleSyncClientes`). Toast com `qtd_total` retornado.

### 3. Frontend — `src/components/bi/drill/ComercialDrillDrawer.tsx`

Ajustar a renderização das colunas para suportar os 3 campos vindos do backend (`cd_produto`, `ds_produto`, `produto_label`):

- Coluna **Produto** (`cd_produto`): renderizar `row.produto_label || row.cd_produto || '—'`.
- Coluna **Descrição do Produto** (`ds_produto`): manter a injeção virtual atual quando o backend não devolver, e renderizar `row.ds_produto || row.descricao_produto || row.nm_produto || '—'` (já é o que faz, ok).
- `filtros_drill` continua intocado — `comercialDrillContract.cleanDrillValue` e `compactDrillContext` já mantêm só `cd_produto`.
- CSV: como `downloadDrillCsv` usa `displayColumns`, com a coluna `ds_produto` injetada o CSV já exporta a descrição automaticamente. ok.

### 4. Documentação para o backend FastAPI

Reescrever `docs/backend-bi-comercial-produto-nome.md` (renomear conceitualmente para "produtos-sincronizar + enriquecimento") cobrindo:

- **Rota** `POST /api/bi/comercial/produtos/sincronizar` (auth JWT ou `x-cron-secret`), SQLs E075PRO + E080SER, upsert em `public.bi_produto` via service role, retorno `{ ok, qtd_produtos, qtd_servicos, qtd_total }`.
- **Enriquecimento da query `/api/bi/comercial/drill`**: `LEFT JOIN public.bi_produto p ON p.cd_produto = f.cd_produto::text` no SQL que lê `v_bi_faturamento_comercial`, com o bloco `raw` exatamente como o usuário descreveu (gerando `ds_produto` e `produto_label`).
- **`_DRILL_COLUMNS`**: incluir `cd_produto` + `ds_produto` em `NOTA_FISCAL` e `DETALHES_IMPOSTOS`; em `PRODUTO` usar `produto_label` + `ds_produto`.
- **`_drill_enriquecer_rows`**: fallback que monta `produto_label` se a query não trouxer.
- **Regra crítica**: `filtros_drill` continua só com `cd_produto` (nunca `produto_label`).

Apagar `docs/backend-bi-comercial-produtos-sincronizar.md`? Já foi apagado na rodada anterior — vou recriá-lo com o conteúdo de sync, e deixar `produto-nome.md` focado no enriquecimento da query de drill. Ficam **dois docs separados** (mesmo padrão usado para clientes).

### 5. Memória

Atualizar `mem://features/drill-bi-comercial.md`:

- Reintroduzir dimensão `bi_produto` (Cloud, populada pelo FastAPI).
- Documentar a rota `/api/bi/comercial/produtos/sincronizar`.
- Documentar que o backend deve fazer `LEFT JOIN bi_produto` e devolver `ds_produto` + `produto_label`.
- `filtros_drill` permanece só com `cd_produto`.

## Fora de escopo

- Implementação Python/SQL real no repositório do FastAPI (externo).
- Mudanças em `bi_cliente` / sincronização de clientes (sem alteração).
- Mudanças em outros drills além das colunas listadas.

## Critérios de aceite

- Tabela `public.bi_produto` existe com grants/RLS.
- Botão "Sincronizar produtos" aparece para admin no `/bi/comercial` e chama o endpoint da FastAPI.
- Drawer renderiza `produto_label` quando o backend devolver, e cai pra `cd_produto` quando não.
- Coluna "Descrição do Produto" continua sendo exibida em NOTA_FISCAL/PRODUTO/DETALHES_IMPOSTOS (vazia até o backend implementar o JOIN, preenchida depois).
- `filtros_drill` em todo drill-down continua só com `cd_produto` — drill-down não quebra mesmo que `produto_label` esteja presente na linha.
- Docs descrevem rota de sync + enriquecimento da query de drill, prontos para o time do FastAPI implementar.
