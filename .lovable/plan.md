## Objetivo
Mostrar nome/descrição do produto nos drills do BI Comercial (Drill por Nota Fiscal, Drill PRODUTO e qualquer linha que exiba `cd_produto`), seguindo exatamente o mesmo padrão já usado para o cliente (`bi_cliente` + `cliente_label`).

## 1. Banco — nova dimensão `public.bi_produto` (migração Lovable Cloud)

```sql
CREATE TABLE public.bi_produto (
  cd_produto    text PRIMARY KEY,
  ds_produto    text,
  nm_produto    text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bi_produto TO authenticated;
GRANT ALL    ON public.bi_produto TO service_role;

ALTER TABLE public.bi_produto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bi_produto select authenticated"
  ON public.bi_produto FOR SELECT TO authenticated USING (true);
```

Sem políticas de insert/update — só `service_role` (FastAPI) popula.

## 2. Frontend

### `src/components/bi/drill/ComercialDrillDrawer.tsx`
- Estender o `useMemo displayColumns` para também tratar drills que tenham `cd_produto`:
  - Se as colunas contêm `cd_produto` e não contêm `ds_produto`/`nm_produto`, inserir uma coluna virtual `ds_produto` (label "Descrição do Produto") logo após `cd_produto`.
- Render da célula `ds_produto`: `r.ds_produto ?? r.nm_produto ?? '—'`.
- Aplica tanto ao drill `PRODUTO` quanto ao drill `NOTA_FISCAL` / `DETALHES_IMPOSTOS` (que já listam `cd_produto`).

### Botão "Sincronizar produtos" (admin)
- Em `src/pages/bi/ComercialPage.tsx`, ao lado do "Sincronizar clientes" já existente, adicionar botão "Sincronizar produtos" visível só para admin, chamando `POST /api/bi/comercial/produtos/sincronizar` (mesmo padrão da rota de clientes).

## 3. Contrato backend (documento, sem código backend aqui)

Criar `docs/backend-bi-comercial-produtos-sincronizar.md` espelhando o de clientes:

- `POST /api/bi/comercial/produtos/sincronizar`
  - Origem ERP Senior: `E075PRO` (ou view equivalente).
  - Mapeamento: `CODPRO → cd_produto`, `DESPRO → ds_produto`, `NOMRED → nm_produto`.
  - UPSERT em lote em `public.bi_produto` via service role.
  - Resposta `{ ok, total, inseridos, atualizados, duracao_ms }`.
- `POST /api/bi/comercial/drill` deve, em todos os drills que retornem `cd_produto` (PRODUTO, NOTA_FISCAL, DETALHES_IMPOSTOS), fazer `LEFT JOIN public.bi_produto p ON p.cd_produto = f.cd_produto::text` e devolver também `ds_produto` (e opcionalmente `produto_label = cd_produto || ' - ' || ds_produto`).
- `filtros_drill` continua contendo **somente** `cd_produto` (nunca label/descrição).

## 4. Memória do projeto
Atualizar `mem://features/drill-bi-comercial.md` adicionando `bi_produto` como dimensão análoga a `bi_cliente`.

## Critério de aceite
- Drill por Nota Fiscal mostra coluna "Descrição do Produto" populada (após backend implementar JOIN + sync).
- Drill PRODUTO mostra descrição ao lado do código.
- Enquanto o backend não sincronizar, a coluna aparece com `—` (não quebra).
- `filtros_drill` continua apenas com `cd_produto`.
- Nenhuma alteração em outros drills (CLIENTE, REVENDA, ESTADO, MENSAL, ACUMULADO).

## Fora de escopo
- Implementação real da rota FastAPI (apenas contrato em docs).
- `bi_revenda` (pode seguir mesmo padrão depois, se solicitado).
