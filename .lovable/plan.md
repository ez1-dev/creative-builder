## Objetivo

Transformar o Dashboard Builder (atualmente Dashboard → Widgets soltos no grid) em uma estrutura hierárquica **Dashboard → Blocos → Componentes**, onde nenhum componente pode existir fora de um bloco.

Aplica-se aos 4 módulos que usam o builder hoje: `passagens-aereas`, `frota`, `maquinas` e `bi-comercial`.

---

## 1. Banco de dados (migração)

Nova tabela `dashboard_blocks`:

- `id uuid pk`
- `dashboard_id uuid` (FK lógica → `dashboards.id`, `on delete cascade` via trigger)
- `title text` (default `'Bloco Principal'`)
- `ordem int`
- `layout jsonb` — posição/altura do bloco no canvas do dashboard (`{x,y,w,h}`)
- `cols smallint default 12` — colunas internas
- `config jsonb default '{}'`
- `created_at`, `updated_at`

Em `dashboard_widgets`:

- adicionar coluna `block_id uuid` (inicialmente nullable para permitir migração)
- após migração de dados → `ALTER ... SET NOT NULL`
- adicionar índice `(block_id, position)`
- o `layout` do widget passa a representar posição **dentro do bloco** (grid local), não mais no dashboard inteiro

RLS: replicar exatamente as policies de `dashboard_widgets` em `dashboard_blocks` (admins/editores por módulo gerenciam o default; usuários gerenciam blocos dos próprios dashboards; leitura para todos os dashboards visíveis). GRANTs padrão para `authenticated` e `service_role`.

**Migração de dados (mesma migration):**

```sql
-- 1 bloco "Bloco Principal" por dashboard que tenha widgets
INSERT INTO dashboard_blocks (dashboard_id, title, ordem, layout)
SELECT d.id, 'Bloco Principal', 0, '{"x":0,"y":0,"w":12,"h":1}'::jsonb
FROM dashboards d
WHERE EXISTS (SELECT 1 FROM dashboard_widgets w WHERE w.dashboard_id = d.id);

-- vincular todos os widgets órfãos
UPDATE dashboard_widgets w
SET block_id = b.id
FROM dashboard_blocks b
WHERE b.dashboard_id = w.dashboard_id AND w.block_id IS NULL;

ALTER TABLE dashboard_widgets ALTER COLUMN block_id SET NOT NULL;
```

Atualizar RPCs `upsert_passagens_dashboard_default`, `upsert_frota_dashboard_default`, `upsert_maquinas_dashboard_default` e o seed do `bi-comercial` para criar um bloco padrão "Bloco Principal" e inserir os widgets default já com `block_id`.

Atualizar a RPC `get_passagens_layout_via_token` (e equivalentes públicas) para retornar também a lista de blocos.

---

## 2. Hooks de layout

Refatorar `usePassagensLayout`, `useFrotaLayout`, `useMaquinasLayout`, `useComercialLayout` para o novo modelo:

```ts
interface DashboardBlock {
  id: string;
  title: string;
  ordem: number;
  layout: { x:number; y:number; w:number; h:number };
  cols: number;
  widgets: Widget[]; // já filtrados por block_id
}

return { dashboardId, blocks, loading, isAdmin,
         saveBlocks, saveWidgets, createBlock, renameBlock,
         deleteBlock, moveWidgetToBlock, deleteWidget, reload }
```

- `load()` busca `dashboard_blocks` + `dashboard_widgets` e agrupa por `block_id`.
- `saveWidgets(blockId, items)` sempre inclui `block_id` no payload (insert/update). Insert sem `block_id` lança erro local antes de chamar o Supabase.
- `moveWidgetToBlock(widgetId, newBlockId)` atualiza `block_id` e zera/normaliza o `layout` para caber no grid do novo bloco.
- `createBlock({title})` cria com `ordem = max+1` e layout default abaixo do último bloco.

---

## 3. UI — Editor (`PassagensLayoutGrid` + wrappers)

Renomear conceitualmente para "Dashboard Grid" com **dois níveis**:

1. **Grid externo (blocos):** react-grid-layout, 12 colunas, cada item é um bloco. Em modo edição permite mover/redimensionar bloco e mostra header com:
   - nome editável
   - botão `+ Adicionar componente` (abre o `AddChartDialog` já existente, recebendo `blockId`)
   - botão excluir bloco (confirma se tiver componentes)
2. **Grid interno (componentes):** dentro de cada bloco, outro react-grid-layout (cols = `bloco.cols`) renderizando apenas os widgets daquele bloco.

Regras de drag-drop:

- O grid interno usa `draggableHandle` próprio; o `onDragStop` do widget não é capturado pelo grid externo.
- Para mover widget entre blocos: handler explícito (botão "Mover para…" no menu do widget) → chama `moveWidgetToBlock`. Não tentamos drag cross-grid (react-grid-layout não suporta nativamente e seria fonte de bugs).
- Não existe canvas livre — todo widget é filho de um `<BlockContainer>`, então é impossível "soltar fora de um bloco".

Botão global "Adicionar componente" no header da página:

- Se não houver bloco selecionado/criado, exibe toast `Selecione ou crie um bloco antes de adicionar componentes.` e abre o diálogo "Novo bloco".

Validação no save:

- Antes de chamar `saveWidgets`, verificar `widgets.every(w => w.block_id)`. Se falhar, toast `Existem componentes fora de blocos. Mova-os para um bloco antes de salvar.` (proteção redundante — o fluxo de UI já garante isso).

Empty state por bloco: `Nenhum componente neste bloco. Clique em + Adicionar componente.`

---

## 4. Árvore lateral (`src/components/bi/tree/TreeView.tsx`)

Reestruturar para 3 níveis:

```text
Dashboard
└── Bloco: Resumo
    ├── Card Faturamento
    ├── Card Meta
    └── Card Atingimento
└── Bloco: Gráficos
    ├── Gráfico Mensal
    └── Gráfico Mix
```

- Cada nó "bloco" tem ações: renomear, excluir, adicionar componente.
- Cada nó "componente" tem: configurar, mover para outro bloco (select), ocultar, excluir.
- Selecionar um bloco/componente foca o item correspondente no canvas (scroll + ring).

---

## 5. Renderização (modo visualização e link público)

- A página renderiza `blocks` em ordem (`ordem` asc).
- Cada bloco vira uma `<section>` com `title` (h2) + grid interno com seus componentes.
- Bloco vazio → estado vazio descrito acima (apenas em modo edição; em visualização pública, bloco sem componentes é omitido).
- Atualizar `PassagensAereasCompartilhadoPage`, `ManutencaoFrotaCompartilhadoPage`, `ManutencaoMaquinasCompartilhadoPage` para consumir blocos via RPC pública.

---

## 6. Critérios de aceite (mapeamento dos testes manuais)

| Critério | Onde é garantido |
|---|---|
| Não salvar componente sem bloco | guard nos hooks + NOT NULL no banco |
| Não arrastar componente para fora de bloco | grid externo só aceita blocos; widgets vivem em grids internos |
| Mover componente entre blocos | ação "Mover para…" + `moveWidgetToBlock` |
| Criar vários blocos | `createBlock` + botão no header |
| Editar propriedades separadamente | painel de config do bloco e do widget (sheets já existentes) |
| Migração de soltos para "Bloco Principal" | bloco da migração SQL |

---

## 7. Arquivos a alterar/criar

**Novos:**
- `supabase/migrations/<timestamp>_dashboard_blocks.sql`
- `src/components/bi/runtime/BlockGrid.tsx` — grid externo de blocos
- `src/components/bi/runtime/BlockContainer.tsx` — wrapper de bloco com header/empty/grid interno
- `src/components/bi/runtime/MoveWidgetToBlockMenu.tsx`

**Refatorar:**
- `src/hooks/usePassagensLayout.ts`, `useFrotaLayout.ts`, `useMaquinasLayout.ts`, `useComercialLayout.ts`
- `src/components/passagens/PassagensLayoutGrid.tsx` → quebrar em "grid de blocos" + reaproveitar grid interno
- `src/components/passagens/PassagensDashboard.tsx`
- `src/components/frota/FrotaDashboard.tsx`
- `src/components/maquinas/MaquinasDashboard.tsx`
- `src/components/bi/runtime/ComercialDashboardGrid.tsx`
- `src/pages/bi/ComercialPage.tsx`
- `src/components/bi/tree/TreeView.tsx`
- `src/components/passagens/AddChartDialog.tsx` (aceitar `blockId` obrigatório)
- páginas compartilhadas (3) — render por blocos
- RPCs: `upsert_*_dashboard_default` e `get_passagens_layout_via_token` (+ equivalentes)

---

## 8. Riscos / decisões

- **Drag entre blocos** fica como ação explícita (menu), não drag visual. Cross-grid no `react-grid-layout` é frágil — explicitar evita bugs.
- **Layout dos widgets**: passa a ser local ao bloco; durante a migração as coordenadas atuais (já consistentes com o canvas inteiro) viram coordenadas do "Bloco Principal" com `w=12` — visualmente idêntico ao layout atual.
- A migração roda em uma única transação; se falhar, nada é commitado. Após approve, os tipos do Supabase são regenerados antes do código novo compilar contra `block_id`.