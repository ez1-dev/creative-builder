
## Objetivo

Adicionar duas telas novas consumindo a API contábil (`api-erp-renato.ngrok.app`):

1. **Aging** (títulos em aberto por faixa de atraso) — receber e pagar.
2. **Kardex** (ficha de estoque por produto com saldo corrido).

Ambas seguem os padrões já usados em Fluxo de Caixa / Indicadores Contábeis (Bearer via `contabilApi`, exports Excel via `fetch` + blob).

---

## 1. API client

Criar `src/lib/contabil/agingApi.ts`:
- `fetchAging({ tipo, codemp, codfil?, data_base?, top? })` → GET `/api/contabil/financeiro/aging`
- `buildAgingExportUrl(...)` + `downloadAgingExcel(...)` (fetch + blob autenticado)
- Tipos: `AgingResponse`, `AgingFaixa`, `AgingParceiro`, `AgingTotais`.

Criar `src/lib/contabil/kardexApi.ts`:
- `fetchKardex({ codpro, data_ini, data_fim, codemp, codfil?, codder?, coddep?, limite? })` → GET `/api/contabil/estoque/kardex`
- `downloadKardexExcel(...)` (fetch + blob autenticado)
- Tipos: `KardexResponse`, `KardexMovimento`, `KardexSaldo`.

---

## 2. Página Aging — `src/pages/contabilidade/AgingPage.tsx`

Rota `/contabilidade/aging`.

Layout:
- **Toolbar**: seletor de empresa/filial (reusar padrão existente das telas contábeis), DatePicker "Data-base" (default = hoje), input "Top N" (default 50), botão **Atualizar**, botão **Exportar Excel**.
- **Tabs** "A Receber" | "A Pagar" (chamar API com `tipo=ambos` uma vez e alternar).
- **Cards resumo** por aba:
  - Total em aberto
  - Total vencido (`v_1_30+v_31_60+v_61_90+v_90_mais`)
  - % da carteira vencida
  - Vencido crítico (`v_90_mais`)
- **Tabela** por parceiro (DataTableBI): Código · Nome · A vencer · 1–30 · 31–60 · 61–90 · +90 · Total. Ordenada por Total desc, com `PaginationControl` client-side (top N do backend + paginação local se necessário).
  - Células `v_90_mais > 0` em vermelho; `v_61_90 > 0` em âmbar.
  - Rodapé com totais por faixa (usar `totais` do payload).
- Export XLSX via `downloadAgingExcel` (fetch + blob, com toast de erro/sucesso).

Dica de negócio (nota informativa acima da tabela): link para `/contabilidade/fluxo-caixa` — "Aging mostra o passado; a Projeção mostra o futuro".

---

## 3. Página Kardex — `src/pages/contabilidade/KardexPage.tsx`

Rota `/contabilidade/kardex`.

Layout:
- **Toolbar**:
  - `AutocompleteAsync` de produto usando o fetcher já existente em `useCadastrosErp` que consome `/api/requisicoes/lookup/componentes`.
  - Empresa/filial, período (data_ini/fim, default últimos 90 dias), campos opcionais depósito (`coddep`) e derivação (`codder`) via autocomplete/text, "Limite" opcional.
  - Botão Atualizar + Exportar Excel.
- **Header do produto** (após carregar): código, descrição, unidade.
- **4 cards**: Saldo inicial (qtd/valor) · Entradas (qtd/valor) · Saídas (qtd/valor) · Saldo final (qtd/valor + custo médio).
- **Banner de conferência**: "Saldo inicial + Entradas − Saídas = Saldo final" com valores calculados vs `saldo_final` do backend, ✔ se bater.
- **Tabela de movimentos** (DataTableBI, ordenada por data): Data · Transação (código – descrição) · Depósito · Lote · Qtd movimento · Qtd saldo · Valor movimento · Valor saldo · Custo médio.
  - Linha inteira colorida por `tipo`: entrada = verde suave, saída = vermelho suave (via `rowClassName`, tokens do design system — sem cores hardcoded).
  - `qtd_movimento` já vem com sinal correto do backend; exibir como veio.
- Export XLSX via `downloadKardexExcel`.

---

## 4. Registro

- `src/App.tsx`: importar `AgingPage` e `KardexPage`, adicionar duas `<Route>` protegidas.
- `src/config/menuCatalog.ts`: adicionar itens no submenu "Financeiro e Contábil":
  - "Aging (Receber/Pagar)" → `/contabilidade/aging`
  - "Kardex de Estoque" → `/contabilidade/kardex`
- `src/config/featureCatalog.ts`: registrar features para Central de Liberações.

---

## 5. Integração com drills existentes (Kardex)

No `DrillDrawer` de razão (contábil), quando a linha tem `codpro`, adicionar botão "Abrir Kardex" que navega para `/contabilidade/kardex?codpro=...&data_ini=...&data_fim=...`. A KardexPage lê os query params na montagem e carrega automaticamente.

---

## Detalhes técnicos

- HTTP: reusar `contabilApi.get` (já cuida do Bearer + ngrok-skip). Timeout padrão 15s serve para ambos.
- Exports Excel: padrão já usado em Indicadores Contábeis (fetch autenticado → blob → `URL.createObjectURL` → `<a>` temporário). Extrair `filename` do `Content-Disposition`.
- Formatação: usar `formatCurrency` / `formatNumber` de `@/lib/format`.
- Estilo: apenas tokens semânticos (`bg-destructive/10`, `text-destructive`, `bg-amber-500/10 text-amber-700 dark:text-amber-400`, `bg-emerald-500/10`) — nada de `bg-red-500` cru.
- Sem alterações no backend nem em `.env`.

Sem migrations, sem edge functions, sem mudanças em componentes já existentes além de `menuCatalog`, `featureCatalog`, `App.tsx` e o botão opcional no `DrillDrawer`.
