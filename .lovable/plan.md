# Redesign — Notas Fiscais de Recebimento (Dashboard Executivo)

Objetivo: elevar o visual da tela ao padrão de um dashboard de BI/ERP executivo, **sem mudar comportamento, dados ou rotas**, mantendo o design system atual (azul corporativo, tokens semânticos, shadcn) e todas as funcionalidades já validadas.

## 1. Filtros recolhíveis no topo

- `FilterPanel` passa a abrir **fechado por padrão** (`defaultOpen={false}`) — segue o padrão de dashboards BI onde filtros ficam acessíveis mas não dominam a tela.
- Acima do FilterPanel, uma **barra fina de "filtros ativos"**: chips horizontais mostrando os filtros aplicados (ex: `Projeto Macro: Genius ✕`, `Mês: 2026-05 ✕`), cada chip removível individualmente. Dá visibilidade do estado sem precisar abrir o painel.
- Header da página ganha o `ExportButton` + um botão "Atualizar" ao lado.

## 2. Hero de KPIs (Visão Gerencial)

Reorganiza as 8 KPIs gerenciais em uma **hierarquia visual**:

```text
┌─────────────────────────────┬──────────┬──────────┬──────────┐
│  TOTAL RECEBIDO (destaque)  │  Qtd NFs │  Itens   │  Fornec. │
│  R$ 1.234.567,00            │   142    │  3.821   │   87     │
│  ▲ ticket médio R$ 8.6k     │          │          │          │
├──────────┬──────────┬───────┴──────────┴──────────┴──────────┤
│ Maior    │ Valor    │  ░░░░░░░░░░░░░░░░░░ Vínculo OC ░░░░░░░░│
│ Forneced.│ Médio/NF │  ▰▰▰▰▰▰▰▰▰▱▱  78% NFs com OC (110)    │
│          │          │  ▰▰▱▱▱▱▱▱▱▱▱  22% sem OC (32)         │
└──────────┴──────────┴────────────────────────────────────────┘
```

- **Card hero** (col-span-2 lg / row-span-2): "Total Recebido" em fonte grande (3xl), com subtítulo "Ticket médio R$ X" e ícone grande à direita. Mantém `border-l-4 border-l-info`.
- 3 KPIs compactos no topo (Qtd NFs, Itens Recebidos, Fornecedores).
- 2 KPIs médios na linha de baixo (Maior Fornecedor, Valor Médio/NF).
- **Painel "Vínculo de OC"** substitui os dois cards "NFs com OC" / "NFs sem OC" por um card único com **duas barras de progresso horizontais** (success + warning) mostrando proporção, contagens e percentuais. Mais informativo e ocupa menos espaço.

Indicadores Operacionais existentes (NFs, Itens, Fornecedores, Valor Líquido, Bruto, Qtd Recebida) ficam recolhidos atrás de um `<details>` "Indicadores operacionais detalhados" — preservados, mas sem competir visualmente.

## 3. Grid de gráficos balanceada

Layout tipo "feature + supporting":

```text
┌────────────────────────────────────┬──────────────────────┐
│ Recebimentos por Mês (Bar grande)  │ Por Tipo de Despesa  │
│ - destaque, col-span-2             │ (Donut com legenda)  │
├──────────────────┬─────────────────┼──────────────────────┤
│ Top 10 Fornec.   │ Top 10 CC       │ Top 10 Projetos      │
├──────────────────┴─────────────────┴──────────────────────┤
│ Por Transação NF (full-width slim)                        │
└────────────────────────────────────────────────────────────┘
```

- Mês: bar chart maior (col-span-2), com **gradiente** (fill via `<linearGradient>` em `hsl(var(--primary))`) e linha de média pontilhada via `ReferenceLine`.
- Tipo de Despesa: vira **donut** (innerRadius=50) com legenda à direita e total no centro.
- Top 10 (Fornecedores/CC/Projetos): cards uniformes com badge de cor da categoria.
- Cada card de gráfico ganha um cabeçalho com ícone pequeno, título e contador (ex: "10 de 87"), border `bg-card`, `shadow-sm` e `hover:shadow-md`.

## 4. Tabela limpa

- Wrapper em `Card` com header próprio: título "Lista detalhada", contador de registros à direita, ícone para alternar densidade (compacta/normal) — opcional via toggle local.
- Coluna **OC Origem** ganha visual mais forte: `Badge` `success` outline com `Link2` quando há OC, `Badge` `warning` outline com `Unlink` quando não há. Mais escaneável.
- Coluna **Situação NF** vira `Badge` colorido por estado (Fechada=success, Cancelada=destructive, Digitada=secondary, demais=outline).
- Cabeçalho sticky ao rolar (já é padrão do `DataTable`?). Se não, adicionar via prop ou wrapper.

Tabs "Lista Detalhada" / "Drill-down Gerencial" mantidas; visual das tabs alinhado ao restante.

## 5. Drill-down

Sem mudança de comportamento. Apenas refino visual: breadcrumbs em `Badge` clicável, "Agrupando por X" em destaque tipográfico, números na tabela alinhados à direita com `tabular-nums`.

## 6. Responsividade

- Mobile: hero KPI ocupa largura total; Top-10 viram lista compacta; gráficos empilham 1 coluna.
- Tablet: 2 colunas; hero mantém destaque.
- Desktop ≥ xl: layout completo descrito acima.

Tudo via classes Tailwind existentes — sem CSS novo.

---

## Arquivos a editar

1. **`src/pages/NotasRecebimentoPage.tsx`** — reorganiza JSX (KPIs, gráficos, tabela), adiciona chips de filtros ativos, abaixa filtros (`defaultOpen={false}`), substitui células de OC e Situação por `Badge`.
2. **`src/components/erp/FilterPanel.tsx`** — sem alteração estrutural; só consumimos `defaultOpen={false}`.

Nenhum arquivo novo. Nenhum mock. Nenhum comportamento ou endpoint alterado. Todas as 12 validações anteriores continuam atendidas.
