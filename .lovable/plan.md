## Customização de gráficos no /bi/comercial

Cada bloco visual da página vira um "slot" que o usuário pode:
1. Alternar rapidamente o tipo de visualização (ex.: barras ↔ linha ↔ pizza ↔ tabela), reaproveitando os mesmos dados.
2. Substituir por qualquer componente da Biblioteca BI, mapeando os datasets já expostos pelo `PageDataProvider`.
3. Restaurar ao padrão — por bloco ou geral.

Preferência salva por usuário no Lovable Cloud.

---

### 1. Modelo de dados (Cloud)

Nova tabela `bi_user_slot_overrides`:

```
id uuid pk
user_id uuid (auth.uid)
page_key text     -- 'bi-comercial'
slot_key text     -- 'mensal' | 'mix' | 'estados' | 'revendas' | 'obras' | 'mensal-tabela' ...
mode text         -- 'builtin' | 'library'
variant text      -- quando mode='builtin': 'combo' | 'bar' | 'line' | 'area' | 'table' ...
component_id text -- quando mode='library': id do componente da Biblioteca BI
mapping jsonb     -- mapeamento input → série/kpi do slot
options jsonb     -- cor, formato, título custom
updated_at timestamptz default now()
unique(user_id, page_key, slot_key)
```

RLS: usuário lê/grava só os seus; `service_role` total. Grants para `authenticated`.

### 2. Catálogo de slots do BI Comercial

Arquivo novo `src/lib/bi/comercialSlots.ts` declara, para cada bloco da tela:

- `slotKey`, `title`, `defaultVariant`, `dataKind` (`'serie-mensal' | 'mix' | 'ranking-uf' | 'ranking-revenda' | 'ranking-obra' | 'tabela-mensal'`).
- Lista de variantes built-in compatíveis com aquele `dataKind` (ex.: ranking-uf aceita `horizontal-bar`, `bar`, `treemap`, `table`).
- Lista de `component_id` da Biblioteca BI compatíveis (filtrada pelo `inputs[].source` do registry).

### 3. Componente genérico `BiSlot`

Novo `src/components/bi/runtime/BiSlot.tsx`:

- Props: `slotKey`, `title`, `dataKind`, dados (kpi/série/rows) + `defaultRender` (o JSX do gráfico padrão de hoje).
- Lê override do hook `useSlotOverride(pageKey, slotKey)`.
- Header do card recebe um menu (ícone ⚙):
  - **Trocar tipo** → submenu com variantes built-in do `dataKind`.
  - **Substituir por componente da Biblioteca BI…** → abre `ReplaceSlotDialog`.
  - **Restaurar padrão** (só aparece quando há override).
- Sem override: renderiza `defaultRender`.
- Com override `builtin`: renderiza variante built-in (mapeada num pequeno switch por `dataKind`).
- Com override `library`: renderiza via `componentRegistry.getComponent(id).render(...)` reutilizando `PageDataContext`.

### 4. Diálogo "Substituir por componente"

`src/components/bi/runtime/ReplaceSlotDialog.tsx`:

- Lista filtrada de componentes da Biblioteca BI compatíveis com `dataKind`.
- Para cada um, formulário de mapeamento (mesma UX já existente em `/biblioteca-bi` "Aplicar em página"), pré-preenchido com a série padrão do slot.
- Botão **Pré-visualizar** (render inline) e **Salvar** (upsert na tabela).

### 5. Barra global

Topo do `ComercialPage`:
- Botão "Restaurar layout padrão" (visível quando há ≥1 override) → deleta todos overrides do usuário para `page_key='bi-comercial'`.

### 6. Refactor do `ComercialPage.tsx`

Cada bloco hoje renderizado direto (`<ComboChartCard …/>`, `<DonutChartCard …/>`, etc.) passa a ser:

```tsx
<BiSlot
  slotKey="mensal"
  title="Faturamento mensal"
  dataKind="serie-mensal"
  data={{ serie: mensal }}
  defaultRender={() => <ComboChartCard ... />}
/>
```

Os handlers de drill-down continuam funcionando: o `BiSlot` repassa `onItemClick` quando a variante suporta.

### 7. Hook utilitário

`src/hooks/useSlotOverrides.ts`:
- Carrega todos overrides do usuário para a página numa única query.
- Expõe `getOverride(slotKey)`, `setOverride(slotKey, payload)`, `clearOverride(slotKey)`, `clearAll()`.
- Invalidação local após mutações.

### 8. Fora de escopo

- Não muda endpoints da FastAPI nem `pageRegistry`.
- Drill-down dos componentes da Biblioteca BI continua limitado (apenas built-ins disparam drill por enquanto).
- Não afeta outras telas BI — `BiSlot` fica genérico mas só é aplicado em `/bi/comercial` nesta entrega.

### Critério de aceite

- Em qualquer bloco do BI Comercial, ⚙ permite trocar para outra variante e a tela atualiza preservando filtros.
- "Substituir por componente da Biblioteca BI…" lista apenas componentes compatíveis e renderiza o escolhido.
- Recarregando a página, a escolha persiste (login do mesmo usuário).
- "Restaurar padrão" no bloco e o botão global voltam ao layout original.
- Outros usuários não veem as escolhas alheias.

### Arquivos afetados

- **Migração SQL** nova: tabela `bi_user_slot_overrides` + RLS + grants.
- **Novos**: `src/lib/bi/comercialSlots.ts`, `src/hooks/useSlotOverrides.ts`, `src/components/bi/runtime/BiSlot.tsx`, `src/components/bi/runtime/ReplaceSlotDialog.tsx`.
- **Editado**: `src/pages/bi/ComercialPage.tsx` (envolver blocos com `BiSlot`, adicionar botão "Restaurar layout padrão").
