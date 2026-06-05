## Diagnóstico

Nos cards "Top estados" e "Ranking de revendas" os valores aparecem corretamente, mas os rótulos vêm vazios ("-" ou em branco). A causa está nos builders de série usados pelas novas chaves dinâmicas do BI Comercial:

- `buildEstadoSerie` lê só `r.cd_estado`.
- `buildRevendaSerie` lê só `r.revenda`.
- `buildObrasSerie` lê só `r.projeto || r.cd_prj`.
- `buildSerieFromDrill` (para CLIENTE/PRODUTO/NF/IMPOSTOS) tem uma lista enxuta de aliases de label.

Quando o backend responde com outro alias (ex.: `n`, `uf`, `sg_uf`, `nm_estado`, `nm_revenda`, `cd_rev_pedido`, `nm_fantasia`, `cliente`, `revenda_label`, etc. — que já aparecem em vários pontos do código, como `comercialFilters.ts` e `comercialDrillCatalog.ts`) o `label` cai para `'-'` e o ranking fica sem nomes.

Além disso, o `SERIES_LIKE` em `componentRegistry.tsx` filtra `label !== ''`, mas aceita `'-'` como label válido, o que torna o vazio "silencioso" no UI.

A correção é puramente de frontend (camada de mapeamento de dados → série); não envolve backend, KPIs, drill drawer nem novos endpoints.

## Mudanças propostas

### 1. `src/lib/bi/comercialSeriesBuilder.ts`

Introduzir um helper `pickLabel(row, candidates)` que tenta múltiplos campos e cai para um placeholder consistente. Ampliar a busca de label nos builders existentes:

- **Estado** → tentar nesta ordem: `nm_estado`, `estado`, `sg_uf`, `uf`, `n`, `cd_estado`.
- **Revenda** → `nm_revenda`, `revenda_label`, `revenda`, `nm_fantasia`, `cd_rev_pedido`.
- **Obras** → `projeto`, `ds_abr_prj`, `nm_projeto`, `cd_prj`.

Estender `LABEL_CANDIDATES` (drill):

- `CLIENTE`: `cliente_label`, `nm_cliente`, `nm_fantasia`, `cliente`, `cd_cliente`.
- `PRODUTO`: `produto_label`, `ds_produto`, `descricao_produto`, `produto`, `cd_produto`.
- `NOTA_FISCAL`: `nota_label`, `cd_nf`, `numero_nf`, `nr_nf`, `nf`.
- `DETALHES_IMPOSTOS`: `imposto`, `tipo_imposto`, `descricao_imposto`, `nm_imposto`, `label`.
- Adicionar fallback para `ESTADO`/`REVENDA`/`PRODUTO` caso o backend reuse o mesmo formato.

Trocar fallback `'-'` por `'(sem nome)'` para deixar visível quando o backend realmente não trouxer rótulo (evita confundir com bug).

### 2. `src/lib/bi/componentRegistry.tsx` — `SERIES_LIKE`

Tratar `'-'`, `'null'`, `'undefined'`, `''` (com trim) como rótulos inválidos e descartar a linha — assim, se a série vier 100% sem nomes, o card mostra estado vazio em vez de uma lista de traços. Mantém retrocompatível com séries que têm rótulos válidos.

### 3. `src/pages/bi/ComercialPage.tsx` (mínimo)

Os mapeamentos legados `estadosSerie` / `mapaData` / `revendaRank` / `obrasRank` (linhas ~266‑269) também usam o mesmo campo único. Trocar por chamadas ao novo helper `pickLabel` exportado do builder para o legado se beneficiar da mesma melhoria. Sem mudança de comportamento quando o backend já entrega `cd_estado`/`revenda`.

## Fora de escopo

- Não alterar backend FastAPI nem endpoints.
- Não mexer em filtros, drill drawer, KPIs nem catálogo de chaves de série.
- Não tocar em `src/integrations/supabase/*` nem `.env`.

## Critérios de aceite

- "Top estados" mostra a UF/nome do estado em cada linha (qualquer um dos aliases acima já basta).
- "Ranking de revendas" mostra o nome/código da revenda.
- Se o backend não trouxer rótulo algum para uma linha, o card mostra estado vazio em vez de uma lista de `-`.
- Demais séries (cliente, produto, NF, detalhe de impostos) também passam a exibir nomes quando o backend usa qualquer um dos aliases comuns.