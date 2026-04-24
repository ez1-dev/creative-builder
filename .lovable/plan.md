## Excluir "OUTROS" e adicionar Drill-Down completo nos KPIs — Faturamento Genius

Mudança 100% no frontend, sem tocar em endpoints, SQL ou backend. Reaproveita os dados que a API já devolve em `dashboard` e `detalhe` e o endpoint `/api/faturamento-genius` para buscar o último nível (linhas individuais de NF/item).

### Arquivo afetado
- `src/pages/FaturamentoGeniusPage.tsx` (único arquivo)

---

### 1. Excluir "OUTROS" da visão padrão

A página passa a **filtrar fora as linhas com `revenda === 'OUTROS'`** em todas as visões agregadas e na lista detalhada, sem alterar parâmetros enviados para a API (a exclusão é feita após o `Promise.all`):

- KPIs do topo (Valores e Volume): recalculados localmente a partir de `detalhe.dados` quando o backend não devolver um sumário "sem OUTROS". Como o `dashboard` agregado vem com OUTROS embutido, fazemos um **recálculo client-side dos KPIs** somando `detalhe.dados` filtrado (mesma fórmula de `valor_total`, `valor_bruto`, `valor_devolucao`, `valor_custo`, `valor_comissao`, `margem_bruta = total - custo`, `margem_% = margem/total*100`, e contagens distintas para notas, pedidos, clientes, revendas, produtos).
- Tabelas resumo (`por_revenda`, `por_origem`, `por_mes`): aplicar `.filter(r => r.revenda !== 'OUTROS')` na tabela de revenda; nas demais, recompor a partir de `detalhe.dados` filtrado para que os totais por origem/mês também excluam OUTROS.
- Tabela de detalhe: filtrar `detalhe.dados.filter(r => r.revenda !== 'OUTROS')`.

**Toggle "Incluir OUTROS"**: adicionar um `Switch` no topo do bloco de resultados (ao lado do título "Valores"), default **desligado**. Quando ligado, mostra tudo como antes. Estado: `incluirOutros: boolean`.

> Observação: como o filtro é local, a paginação reflete a contagem original do backend. Adicionamos uma badge discreta abaixo da tabela detalhada: *"X linhas ocultas (OUTROS) nesta página"*.

---

### 2. Drill-down nos KPIs até o último nível

Cada `KPICard` vira clicável (cursor-pointer + hover). Ao clicar, abre um **`Sheet` (painel lateral) em cascata** com 4 níveis de aprofundamento. Estado: `drill: { kpi, nivel, filtros }` controlando o painel.

**Estrutura da árvore de drill (a partir de `detalhe.dados` já carregado, sem nova chamada de API quando possível):**

```text
KPI clicado (ex.: Valor Total)
└─ Nível 1: por Revenda          (lista, soma e %)
   └─ Nível 2: por Mês (anomes)  (dentro da revenda escolhida)
      └─ Nível 3: por Cliente    (dentro de revenda+mês)
         └─ Nível 4: NFs/itens   (linhas brutas: NF, série, pedido, produto, qtd, bruto, total, custo, comissão, ICMS, IPI, PIS, COFINS, frete, devolução, desconto)
```

Para KPIs específicos a árvore se ajusta:

| KPI | N1 | N2 | N3 | N4 |
|---|---|---|---|---|
| Valor Total / Bruto / Devolução / Custo / Comissão / Margem Bruta / Margem % | Revenda | Mês | Cliente | NF/itens |
| Notas | Revenda | Mês | Cliente | NFs únicas (NF + série + emissão + valor) |
| Pedidos | Revenda | Mês | Cliente | Pedidos únicos (pedido + itens + total) |
| Clientes | Revenda | Mês | Cliente (com totais) | NF/itens do cliente |
| Revendas | Revenda (com totais) | Mês | Cliente | NF/itens |
| Produtos | Revenda | Produto (top N) | Cliente | NF/itens |

Cada nível mostra:
- Cabeçalho com **breadcrumb** ("Valor Total → GENIUS → 03/2025 → Cliente X").
- Sub-KPIs do recorte atual (total, notas, clientes, % do total geral).
- Tabela com linhas clicáveis para descer um nível; última camada usa as colunas já existentes em `colsDetalhe`.
- Botão "Voltar" e "Fechar" no topo do `Sheet`.

**Fonte dos dados do drill**: tudo é derivado em memória de `detalhe.dados` (que já vem do endpoint `/api/faturamento-genius`). Como o detalhe é paginado (100 por página), o drill apresenta um aviso quando `total_paginas > 1`: *"Mostrando dados da página atual. Para visão completa, use Exportar Excel."* — sem chamar endpoint novo.

---

### Detalhes técnicos

- Novos estados: `incluirOutros: boolean`, `drill: { open, kpiKey, path: Array<{label, key, value}> } | null`.
- Helper `aplicarFiltroOutros(rows)` aplicado a `detalhe.dados` antes dos cálculos e tabelas.
- Helper `recalcularKpis(rows)` que devolve o mesmo shape de `dashboard.kpis` somando os campos das linhas filtradas (com `Set` para distintos).
- Helper `agruparPor(rows, chave, agregados)` reutilizado nos 4 níveis.
- Componente interno `<DrillSheet>` usando `Sheet` do shadcn (`side="right"`, largura `sm:max-w-3xl`), com `<DataTable>` + breadcrumb + sub-KPIs.
- Atualizar a nota técnica do rodapé para refletir que "OUTROS" está **oculto por padrão** e pode ser exibido pelo Switch.
- Atualizar `KPICard` apenas via prop existente (se já aceita `onClick`); se não, passa-se um wrapper `<button>` em volta — verificar `KPICard` antes da implementação. Sem alterar a assinatura pública do componente para outras páginas.

### Garantias
- Endpoints **inalterados**: `GET /api/faturamento-genius-dashboard`, `GET /api/faturamento-genius`, `GET /api/export/faturamento-genius`, `POST /api/faturamento-genius/atualizar`.
- Sem SQL, sem nome de tabela usado para montar consulta.
- Filtros, paginação, exportação, "Atualizar Comercial", banners 401/404 e fonte indisponível — todos preservados.
- Exportação Excel continua usando os params originais (sem o filtro local de OUTROS), para não divergir do que o backend entende. Caso queira que a exportação também exclua OUTROS, basta marcar — adicionamos `revenda_excluir=OUTROS` aos params do `ExportButton` somente se o backend já aceitar; na dúvida, mantemos como está e o usuário filtra no Excel.
- Nenhuma outra página é tocada.
