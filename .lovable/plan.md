## Objetivo

Hoje os gráficos e o drawer de drill do BI Comercial mostram apenas códigos (ex.: `202601`, `cd_prj=80100`, `SP`). Vamos exibir **código + nome** em todas as 4 dimensões — **Cliente, Revenda, Estado, Obra/Projeto** — em:

1. Gráficos/rankings da página `/bi/comercial` (barra, ranking, donut, treemap, mapa, séries customizadas).
2. Drawer multinível de drill (`ComercialDrillDrawer`) — colunas `cliente_label`, `revenda_label`, `estado_label`, `obra_label`.
3. Chips de filtro ativos no topo da página.

Cross-filter continua usando **só o código** (`cd_rev_pedido`, `cd_estado`, `cd_prj`, `cd_cliente`) — o label é puramente apresentação.

---

## Estratégia de origem dos nomes

| Dimensão | Fonte | Status |
|---|---|---|
| Cliente | `public.bi_cliente` (já existe) | OK — backend já entrega `cliente_label` |
| Produto | `public.bi_produto` (já existe) | OK |
| Revenda | **`public.bi_revenda` (criar)** + sync ERP (E140REV / equivalente) | Novo |
| Obra/Projeto | `public.bi_projetos` (**já existe**, 5 colunas) — verificar se tem `ds_obra`/`nome` | Possivelmente já dá; senão estender sync |
| Estado (UF) | Mapa fixo no frontend (`AC → Acre`, …) | Sem backend |

---

## Parte 1 — Lovable Cloud: nova tabela `bi_revenda`

Migração (CREATE TABLE + GRANTs + RLS + policy de leitura para `authenticated`; escrita só `service_role`):

```text
bi_revenda
├─ cd_rev_pedido text PRIMARY KEY      -- código usado em v_bi_faturamento_comercial
├─ nm_revenda text
├─ nm_fantasia text NULL
├─ cd_empresa int NULL
├─ ativo bool default true
├─ created_at / updated_at
```

Padrão idêntico a `bi_cliente` / `bi_produto`. Frontend nunca grava — só `service_role` (FastAPI).

---

## Parte 2 — Backend FastAPI (3 documentos novos em `docs/`)

### 2.1 `docs/backend-bi-comercial-revendas-sincronizar.md`
- `POST /api/bi/comercial/revendas/sincronizar` — lê E140REV (ou tabela cadastral equivalente do ERP Senior) e faz UPSERT em `public.bi_revenda` via service role.
- Resposta: `{ inseridos, atualizados, total }`.

### 2.2 `docs/backend-bi-comercial-drill-labels.md` (extensão dos contratos existentes)
Para cada `drill_type`, o backend deve devolver `*_label` quando agregar pela dimensão:

| drill_type | Coluna agregada | Label esperado |
|---|---|---|
| ESTADO | `cd_estado` | `estado_label = cd_estado || ' - ' || nm_estado` (lookup fixo no backend) |
| REVENDA | `cd_rev_pedido` | LEFT JOIN `bi_revenda` → `revenda_label = cd_rev_pedido || ' - ' || nm_revenda` |
| CLIENTE | `cd_cliente` | já entrega `cliente_label` (manter) |
| PRODUTO | `cd_produto` | já entrega `produto_label` (manter) |
| (qualquer drill agrupado por obra) | `cd_prj` | `obra_label = cd_prj || ' - ' || ds_obra` via `bi_projetos` |

Regras invioláveis:
- `filtros_drill` em **toda linha** continua contendo **APENAS o código** (`cd_rev_pedido`, `cd_estado`, `cd_prj`, `cd_cliente`). Nunca o label.
- `*_label` é estritamente apresentação.

### 2.3 `docs/backend-bi-comercial-series-labels.md` (séries agregadas)
Endpoints de séries que hoje agregam por `cd_rev_pedido` / `cd_estado` / `cd_prj` no “Ranking de revendas”, “Top estados”, “Faturamento por obra”, etc., devem passar a devolver junto:

```json
{ "cd_rev_pedido": "202601", "nm_revenda": "...", "revenda_label": "202601 - ...", "valor": 4119 }
```

Mesma regra para `cd_estado` / `nm_estado` / `estado_label` e `cd_prj` / `ds_obra` / `obra_label`.

---

## Parte 3 — Frontend

### 3.1 Catálogo de UF (puro frontend)
- Novo: `src/lib/bi/ufLabels.ts` com `UF_LABELS: Record<string, string>` (27 UFs + DF).
- Helper `formatEstadoLabel(cd_estado)` → `"SP - São Paulo"`.

### 3.2 Adapter genérico de label
- Novo: `src/lib/bi/dimensionLabels.ts` exportando `pickDimensionLabel(row, dim)` que prioriza:
  1. `*_label` do backend
  2. `cd_xxx + ' - ' + nm_xxx` se nome veio na linha
  3. `cd_xxx` puro

Usado pelos componentes BI da lib (`Ranking`, `BarChart`, `Treemap`, `MapaUF`, `DrillDownTable`, `ChartContextMenu` breadcrumb).

### 3.3 Componentes da biblioteca BI (`src/components/bi/...`)
- Adaptar widgets já existentes que renderizam `label` (ranking de revendas, top estados, treemap de obras, top clientes…) para chamar `pickDimensionLabel` antes de exibir.
- Não muda o cross-filter — continua mandando o **código** para `toggleDrill`.

### 3.4 Drawer de drill (`src/components/bi/drill/DrillDownTable.tsx`)
- Já injeta coluna “Descrição do Produto” quando `ds_produto` vem sem coluna. Replicar padrão:
  - Drill `REVENDA` → injetar coluna "Revenda" exibindo `revenda_label`.
  - Drill `ESTADO` → injetar coluna "Estado" exibindo `estado_label` (com fallback `formatEstadoLabel`).
  - Drill agrupado por `cd_prj` → injetar coluna "Obra" com `obra_label`.

### 3.5 Chips de filtro (`src/lib/bi/comercialFilters.ts` + componente que renderiza chips em `ComercialPage`)
- `DrillChip` ganha `displayValue` opcional.
- `useComercialFilters` mantém o `value` (código) e calcula `displayValue` via cache de labels em memória (alimentado pelas respostas do backend) + `formatEstadoLabel` para UF.
- Chip mostra `displayValue`; ao remover, continua usando `key`+`value` (código).

### 3.6 Botão "Sincronizar revendas" (header `/bi/comercial`)
- Mesma UX dos botões "Sincronizar clientes" / "Sincronizar produtos" (admin-only).
- Chama `POST /api/bi/comercial/revendas/sincronizar` via `api.ts`.

### 3.7 Atualizações de memória / docs
- `mem/features/drill-bi-comercial.md`: registrar `bi_revenda`, `*_label` p/ REVENDA/ESTADO/OBRA, `formatEstadoLabel` no frontend, regra `filtros_drill` continua só com código.

---

## Fora de escopo

- Mexer no fluxo de cross-filter / `toggleDrill` (continua por código).
- Backfill histórico — backend popula `bi_revenda` na 1ª sincronização.
- Drill por TNS / Tipo Movimento (tratado em outro plano).

---

## Detalhes técnicos resumidos

- **Migração Cloud**: criar `public.bi_revenda` com GRANTs `SELECT → authenticated`, `ALL → service_role`, RLS habilitado, policy `SELECT USING (true)` para authenticated.
- **`bi_projetos`**: confirmar via `supabase--read_query` se já há coluna de descrição da obra; se faltar, adicionar na mesma migração.
- **Cache de labels frontend**: simples `Map<string, string>` por chave (`revenda:202601 → "..."`) preenchido conforme respostas do backend chegam — sem persistência, sem fetch extra.
- **Compatibilidade**: enquanto backend não devolver `*_label` ou tabela não estiver populada, fallback exibe apenas o código (comportamento atual). Nenhuma quebra.
