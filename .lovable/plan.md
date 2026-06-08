## Objetivo

Backend agora devolve `categoria_label` (rótulo já pronto, agnóstico de dimensão) em todos os rankings/gráficos do BI Comercial, além dos campos específicos (`revenda_label`, `nm_revenda`, `estado_label`, `nm_estado`, `obra_label`, `ds_obra`, `produto_label`, `ds_produto`) e `serie_label` para legendas de séries temporais.

Frontend só precisa garantir: **render `row.categoria_label` com fallback para `row.label`** — sem precisar inferir dimensão. Os adapters existentes (`pickDimensionLabel`) continuam funcionando como camada secundária.

## Mudanças (apenas apresentação)

### 1. `src/lib/bi/dimensionLabels.ts`
Adicionar `'categoria_label'` no topo de `labelKeys` de **todas** as dimensões (cliente, revenda, estado, obra, produto). Assim, qualquer consumidor que já usa `pickDimensionLabel` passa a respeitar `categoria_label` automaticamente como primeira opção, antes mesmo de `serie_label`/`*_label` específico.

Ordem final de `labelKeys` por dimensão:
`['categoria_label', 'serie_label', '<dim>_label', 'display_label']`

### 2. `src/lib/bi/comercialSeriesBuilder.ts`
- Adicionar `'categoria_label'` no topo de `ESTADO_LABEL_KEYS`, `REVENDA_LABEL_KEYS`, `OBRA_LABEL_KEYS`.
- Em `LABEL_CANDIDATES` (drills CLIENTE, PRODUTO, NOTA_FISCAL, DETALHES_IMPOSTOS), também prefixar `'categoria_label'`.
- Em `buildMixSerie`, trocar `pickLabel(r, ['categoria', 'label', 'nome'])` por `pickLabel(r, ['categoria_label', 'categoria', 'label', 'nome'])`.

### 3. `src/pages/bi/ComercialPage.tsx`
Os memos `estadosSerie`, `revendaRank`, `obrasRank` já chamam `pickDimensionLabel(..., '<dim>')` — herdam automaticamente o suporte a `categoria_label` via mudança #1. Nada a alterar.

Para o `donutMix` (categoria custom), atualizar a chamada de `pickComercialLabel(m, ['categoria'])` para incluir `categoria_label` como primeira chave: `pickComercialLabel(m, ['categoria_label', 'categoria'])`.

### 4. `src/components/bi/drill/ComercialDrillDrawer.tsx`
Se o drawer renderiza linhas crus, garantir que a coluna de "rótulo" use `row.categoria_label ?? row.label ?? <fallback existente>`. Verificar implementação atual e ajustar só se necessário (a injeção de colunas de nome já implementada continua válida como safety-net visual).

## Fora de escopo

- `filtros_drill` permanece **inalterado** (só códigos crus: `cd_cliente`, `cd_rev_pedido`, `cd_estado`, `cd_prj`, `cd_produto`).
- Sem mudanças em contratos, endpoints, migrations, layout, cores ou cross-filter.
- Safety-nets via `bi_cliente`/`bi_produto`/`bi_revenda` continuam ativos.

## Arquivos tocados

- `src/lib/bi/dimensionLabels.ts` — `categoria_label` no topo das 5 dimensões.
- `src/lib/bi/comercialSeriesBuilder.ts` — `categoria_label` em todos os arrays de labelKeys e em `buildMixSerie`.
- `src/pages/bi/ComercialPage.tsx` — apenas o donut/mix.
- `src/components/bi/drill/ComercialDrillDrawer.tsx` — verificar/ajustar coluna de label (se já não respeitar).
