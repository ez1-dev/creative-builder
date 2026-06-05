## Objetivo

Expandir o dropdown de **Série** da Biblioteca BI no BI Comercial (igual ao que foi feito em Frota), com combinações de **dimensão × métrica** para os cards configuráveis.

## Dimensões e métricas

**Métricas (9):** Faturamento (R$), Líquido (R$), Impostos (R$), Devolução (R$), Nº Vendas, Nº Clientes, Quantidade, Ticket Médio (R$), Preço Médio (R$).

**Dimensões (8):**
- `mes` — Evolução mensal (Ano/Mês)
- `ano` — Evolução anual
- `estado` — Por estado / UF
- `revenda` — Top revendas
- `cliente` — Top clientes (cd + nm via `bi_cliente`)
- `produto` — Top produtos
- `nota_fiscal` — Top notas fiscais
- `detalhe_impostos` — Quebra ICMS / IPI / PIS / COFINS / ISS / DIFAL

Total ≈ **72 combinações** (8 × 9) + chaves legadas (`mensal`, `mix`, `estados`, `revendas`, `obras`) preservadas como "— legado" para layouts já salvos.

## Estratégia de dados

Sem novo endpoint dedicado. Reaproveitar o que já existe:

1. **`mes` / `ano`** → derivar de `qMensal` (já traz por linha: faturamento, fat_liquido, impostos, devolucao, numero_vendas, numero_clientes, quantidade). Ticket médio = fat/nº vendas; Preço médio = fat/quantidade. `ano` agrega `mensal` por `ano_emissao`.
2. **`estado` / `revenda`** → endpoints atuais (`fetchComercialEstado`, `fetchComercialRevenda`) trazem só faturamento; complementar com chamadas ao **drill API** já existente (`POST /api/bi/comercial/drill` com `drill_type=ESTADO|REVENDA`) que devolve todas as métricas agregadas (faturamento, líquido, impostos, qtd, nº vendas). Cache via React Query.
3. **`cliente` / `produto` / `nota_fiscal` / `detalhe_impostos`** → consumir o **drill API** existente (`drill_type` correspondente), já documentado em `mem://features/drill-bi-comercial`. Carregamento lazy: só dispara fetch quando um widget pede aquela dimensão.

Nenhuma mudança de backend é necessária — todo o catálogo do drill já cobre as dimensões pedidas.

## Mudanças de código

### `src/lib/bi/pageRegistry.ts`
- Adicionar `COMERCIAL_DIMENSOES` e `COMERCIAL_METRICAS` exportados.
- Função `buildComercialSeriesOptions()` análoga a `buildFrotaSeriesOptions()`, gerando chaves no padrão `por_<dim>__<metric>` + `mensal__<metric>` + `anual__<metric>`.
- Manter chaves antigas (`mensal`, `mix`, `estados`, `revendas`, `obras`) com sufixo "— legado".

### `src/lib/bi/comercialApi.ts`
- Helper `fetchComercialDrillAgg(drillType, contexto, filters)` que chama o drill API e devolve `{ label, valor }` para uma métrica específica. Já existe a chamada — só envelopar.

### `src/pages/bi/ComercialPage.tsx`
- Novo hook `useSerieFromKey(seriesKey)` que:
  - Faz parse `por_<dim>__<metric>` / `mensal__<metric>` / `anual__<metric>`.
  - Para `mensal`/`anual`: deriva client-side de `qMensal`.
  - Para `por_<dim>`: usa React Query com `queryKey: ['bi-comercial-serie', dim, metric, filters, unidade]` e chama drill API.
  - Retorna `{ data, isLoading, isError, refetch }`.
- No render dos widgets do tipo `serie`/`ranking`/`map`, usar `useSerieFromKey(widget.mapping.series)` em vez do switch fixo de tipos.
- Manter os tipos legados (`mix`, `estados`, `revendas`, `obras`) operando como hoje.

### `src/components/bi/charts/*` e `src/lib/bi/componentRegistry.tsx`
- Já têm `formatterForSeriesKey()` (criado no último ciclo). Estender o mapeamento de sufixos para reconhecer os novos: `__faturamento`, `__liquido`, `__impostos`, `__devolucao`, `__nvendas`, `__nclientes`, `__quantidade`, `__ticket`, `__preco_medio`. Aplica `formatCurrency` ou `formatNumber` corretamente.

### `src/components/passagens/seriesSelectGroups.tsx`
- Estender o agrupamento para reconhecer prefixos `mensal__`, `anual__`, `por_*__*` (já cobre os dois primeiros) — só validar os labels dos grupos: **Evolução temporal**, **Por dimensão**, **Legado**.

## Fora de escopo

- Não cria endpoints novos no FastAPI.
- Não mexe em ETL / tabelas `bi_*`.
- Não altera os KPIs nem o drill drawer.
- Layouts/preferências já salvas continuam funcionando via aliases legados.

## Critérios de aceitação

1. No diálogo "Configurar bloco → Biblioteca BI" do BI Comercial, o dropdown de **Série** mostra todas as combinações dimensão × métrica agrupadas em 3 seções (Evolução temporal, Por dimensão, Legado).
2. Selecionar "Cliente · Faturamento (R$)" renderiza ranking real com `cd_cliente - nm_cliente`.
3. Selecionar "Por estado · Quantidade" renderiza estados com a métrica de quantidade (não faturamento).
4. Selecionar "Detalhe de impostos · Impostos (R$)" mostra barras com ICMS, IPI, PIS, COFINS, ISS, DIFAL.
5. Valores em % formatam como `33,47%`; R$ como moeda; demais como número (sem cifrão).
6. Layouts salvos antes da mudança continuam abrindo (chaves legadas preservadas).