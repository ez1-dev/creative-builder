# Componentes BI injetáveis em páginas reais

Hoje o `/biblioteca-bi` é apenas um catálogo visual com mock. A proposta transforma cada componente em um **widget aplicável** a páginas reais do ERP: o usuário clica no card, escolhe **página + seção (slot)**, mapeia campos de dados, e o componente passa a renderizar lá usando os filtros e datasets daquela página — responsivo e persistido por usuário.

---

## Como funciona (fluxo do usuário)

1. Em `/biblioteca-bi`, cada componente do catálogo ganha um botão **"Aplicar em página…"**.
2. Abre um modal **"Onde incluir este componente?"** com:
   - **Página alvo** (combo): Painel de Compras, NF Recebimento, Produção, Faturamento Genius, Estoque, Passagens Aéreas, etc.
   - **Seção / slot** (combo dependente): "Linha de KPIs", "Linha de gráficos", "Tabela auxiliar", "Sidebar". Os slots disponíveis vêm do registry da página.
   - **Título do widget**, ordem (arrastar para reordenar depois), largura (`1/2/3/4` cols).
   - **Mapeamento de dados** (auto-sugerido): combos populados com os campos publicados pela página (ex.: `kpis.total_compras`, `series.compras_por_mes`, `dados[].fornecedor`). Mapeamento auto via heurística + ajuste manual.
   - **Pré-visualização ao vivo** usando os dados reais da página alvo (busca leve do dashboard endpoint).
3. **Salvar** persiste em Lovable Cloud, vinculado ao usuário.
4. Na página alvo, o widget aparece no slot escolhido, recebe `filtros` e `dataset` da página, recalcula ao mudar filtros, e é responsivo (grid `cols`/`span`).
5. Em cada widget renderizado: menu `⋮` para **editar mapeamento, mover, redimensionar, remover**.

---

## Arquitetura

```text
┌─ Página real (PainelComprasPage) ───────────────────────────┐
│  useDashboardData() ──► { dashboard, dados, filtros }        │
│                                                              │
│  <PageDataProvider pageKey="painel-compras"                  │
│                    schema={SCHEMA} data={...} filtros={...}> │
│    ...layout fixo da página...                               │
│    <UserWidgetsSlot section="kpis" />     ← injeção          │
│    <UserWidgetsSlot section="charts" />                      │
│    <UserWidgetsSlot section="tables" />                      │
│  </PageDataProvider>                                         │
└──────────────────────────────────────────────────────────────┘

Biblioteca BI (catálogo)
  └─ <Card componente> ─► [Aplicar em página…] ─► <ApplyComponentDialog />
        └─ salva em bi_user_widgets

UserWidgetsSlot
  └─ lê bi_user_widgets do usuário p/ (pageKey, section)
  └─ resolve componente por id, injeta props mapeadas a partir do PageDataProvider
```

---

## Itens a construir

### 1. Registry de páginas alvo
`src/lib/bi/pageRegistry.ts` — declara cada página candidata:
```ts
{
  key: 'painel-compras',
  label: 'Painel de Compras',
  route: '/painel-compras',
  sections: [
    { key: 'kpis',   label: 'Linha de KPIs',    accepts: ['kpi'] },
    { key: 'charts', label: 'Linha de gráficos', accepts: ['chart','map','tree'] },
    { key: 'tables', label: 'Tabelas auxiliares', accepts: ['table'] },
  ],
  // schema dos dados publicados pela página (campos que aparecem no mapeamento)
  schema: {
    kpis:   ['total_compras','total_recebido','ticket_medio','qtde_notas'],
    series: ['compras_por_mes','top_fornecedores','tipos_despesa'],
    rows:   { source:'dados', fields:['fornecedor','tipo','centro','valor_liquido','status'] },
  }
}
```

### 2. Registry de componentes
`src/lib/bi/componentRegistry.ts` — declara cada componente exportado pela lib com:
- `id`, `kind` (`kpi|chart|map|tree|table`), `label`, `Component`, `defaultSpan`
- `propsSchema`: quais inputs ele precisa (`value:number`, `series:Point[]`, `data:Row[]`)
- `autoMap(pageSchema)`: heurística que sugere mapeamento inicial.

### 3. PageDataProvider + hook
`src/lib/bi/PageDataContext.tsx`:
- Provider expõe `{ pageKey, schema, kpis, series, rows, filtros, refresh }`.
- `useResolvedProps(componentId, mapping)` → resolve as props finais a partir do contexto.

### 4. Slot de injeção
`src/components/bi/runtime/UserWidgetsSlot.tsx`:
- Carrega widgets persistidos para `(user, pageKey, section)`.
- Renderiza dentro de `DashboardGrid`/`KpiGrid` respeitando `span` de cada widget.
- Cada widget envolto em `<UserWidgetFrame>` com menu `⋮` (editar/mover/remover).

### 5. Modal "Aplicar em página"
`src/components/bi/runtime/ApplyComponentDialog.tsx`:
- Steps: **Página → Seção → Mapeamento → Pré-visualização → Salvar**.
- Filtra páginas/seções pelo `kind` do componente (KPI só vai em seção `accepts: ['kpi']`).
- Pré-visualização usa `useDashboardData` apontando para o endpoint da página alvo, aplicando filtros default.

### 6. Botão no catálogo
Atualizar `BiComponentsDemoPage.tsx` (e `DemoBlock`) para mostrar um botão **"Aplicar em página…"** em cada exemplo, abrindo o modal pré-preenchido com o componente correspondente.

### 7. Editor / reordenação na página alvo
Modo "edição de dashboard" toggle no header da página: quando ligado, slots ficam com bordas, suporta drag-to-reorder (`@dnd-kit/sortable` — já é padrão), redimensionar `span`, e botão "+" para abrir o catálogo já filtrado para aquela seção.

### 8. Persistência (Lovable Cloud)
Nova tabela:
```sql
create table public.bi_user_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_key text not null,
  section text not null,
  component_id text not null,
  title text,
  span smallint not null default 1,
  ordem int not null default 0,
  mapping jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bi_user_widgets enable row level security;
-- policies: select/insert/update/delete WHERE user_id = auth.uid()
create index on public.bi_user_widgets (user_id, page_key, section, ordem);
```

### 9. Páginas alvo (Fase 1)
Instrumentar 3 páginas para aceitar widgets injetados:
- `PainelComprasPage` — slots `kpis`, `charts`, `tables`.
- `NotasRecebimentoPage` — mesmos slots.
- `producao/ProducaoDashboardPage` — `kpis`, `charts`.

Demais páginas entram em fase posterior (mesma instrumentação, ~10 min/página).

### 10. Documentação
Adicionar seção em `docs/biblioteca-bi-guia-uso.md`: "Como tornar uma página alvo de widgets" (registrar no `pageRegistry`, envolver em `PageDataProvider`, plotar `UserWidgetsSlot`).

---

## Princípios

- **Sem mexer na lógica** das páginas (fetch, filtros, KPIs continuam idênticos).
- **Filtros são propagados automaticamente**: o widget recebe `filtros` via context, então recalcula naturalmente quando o usuário filtra.
- **Responsivo por padrão**: widgets renderizam dentro dos grids existentes (`KpiGrid`, `ChartGrid`) que já são mobile-first.
- **Por usuário**: cada um monta seu painel; nada vaza entre contas (RLS).
- **Reversível**: remover widget não afeta nada do layout fixo da página.

---

## Entregáveis (PR único, fase 1)

1. Migration `bi_user_widgets` + policies RLS.
2. `pageRegistry`, `componentRegistry`, `PageDataContext`.
3. `UserWidgetsSlot`, `UserWidgetFrame`, `ApplyComponentDialog`, `EditDashboardToggle`.
4. Botão "Aplicar em página…" em todos os blocos do catálogo.
5. Instrumentação das 3 páginas piloto (`Painel Compras`, `NF Recebimento`, `Produção`).
6. Doc atualizada.

Fase 2 (depois): drag-to-reorder visual, duplicar widget, exportar/importar layout, compartilhar dashboard com outro usuário.
