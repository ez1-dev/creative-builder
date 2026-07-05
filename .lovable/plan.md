## Escopo

Backend 8070 já reiniciado — KPIs do Painel de Compras validados. Agora aplicar as 4 melhorias frontend pendentes.

---

### 1) Análise Gerencial com IA no Painel de Compras

- Montar o componente `ComprasAiChartGenerator` (já existe em `src/components/compras/ComprasAiChartGenerator.tsx`) dentro do `PainelComprasPage.tsx`, logo acima da seção de gráficos gerenciais.
- Passar `filtrosAtivos` = objeto de filtros correntes do painel e `onDrill` = mesma função de drill já usada pelos cartões (abre `PainelDrillView`).
- Sem mudança de lógica de dados: reaproveita `POST /api/compras/ia-grafico` via `src/lib/bi/comprasIaChartApi.ts` (já pronto).

### 2) Gráficos do Painel de Compras trocáveis pela Biblioteca BI

- Substituir os gráficos gerenciais fixos por `DashboardBlocksRenderer` alimentado pelo catálogo `src/lib/bi/comprasWidgetCatalog.ts` (já existente).
- Usar o hook `useDashboardBlocks` com `pageKey="painel-compras"` para persistir layout do usuário (mesmo padrão de `/passagens-aereas` e demais páginas BI).
- Manter cards de KPI e a Lista Detalhada como estão — troca só afeta a faixa de gráficos.
- Fallback: se `useDashboardBlocks` retornar vazio, chamar `ensureDefaultBlock` com o preset padrão de Compras.

### 3) BI Comercial — negativos em vermelho sem sinal

- Ajustar formatters em `src/lib/bi/comercial.ts` / `comercialMetrics.ts` e no `formatCurrency`/`formatNumber` usados pelos cartões BI Comercial: quando `valor < 0`, renderizar `Math.abs(valor)` formatado dentro de `<span className="text-destructive">`.
- Escopo restrito ao BI Comercial (páginas em `src/pages/bi/comercial/*` e componentes que consomem esses formatters). Não altera Painel de Compras nem DRE.
- Cobertura: KPIs, tabelas, tooltips e dataLabels de gráficos.

### 4) 01 – Resumo Folha: botão Exportar Excel

- Adicionar `<ExportButton endpoint="/api/rh/resumo-folha/export" params={filtrosAtuais} label="Exportar Excel" />` no header da tela `src/pages/rh/ResumoFolhaPage.tsx` (ou nome equivalente da 01), ao lado dos demais controles.
- Reaproveita o componente pronto em `src/components/erp/ExportButton.tsx` — sem mudança de backend (endpoint já existente conforme docs de RH).

---

## Detalhes técnicos

- Arquivos a editar:
  - `src/pages/PainelComprasPage.tsx` (itens 1 e 2)
  - `src/lib/bi/comercial.ts`, `src/lib/bi/comercialMetrics.ts` e componentes de KPI/tabela de `src/pages/bi/comercial/*` (item 3)
  - `src/pages/rh/ResumoFolhaPage.tsx` (item 4 — confirmar nome real do arquivo antes de editar)
- Sem migrations, sem mudanças em Cloud, sem novos endpoints.
- Verificação: typecheck automático + inspeção visual no preview em `/painel-compras`, `/bi/comercial` e `/rh/resumo-folha`.

## Fora de escopo

- Qualquer mudança em backend FastAPI.
- Alterar lógica de KPIs do Painel de Compras (já corrigida).
- Trocar gráficos do BI Comercial ou do DRE.
