## Salvar filtros no Balanço Patrimonial e na DRE Studio (Visualização)

### 1. Backend (Lovable Cloud)

Nova tabela `bi_user_filter_presets` (privada por usuário via RLS):

```
id            uuid pk
user_id       uuid  -> auth.users
page_key      text  -- 'balanco-patrimonial' | 'dre-studio-visualizacao'
nome          text
filtros       jsonb -- snapshot dos filtros da tela
is_default    boolean default false  -- carregar automaticamente ao abrir
created_at, updated_at
unique (user_id, page_key, nome)
```

- GRANT para `authenticated` + `service_role`.
- RLS: SELECT/INSERT/UPDATE/DELETE apenas onde `user_id = auth.uid()`.
- Trigger para garantir apenas 1 `is_default = true` por (user_id, page_key).

Além disso, o "lembrar últimos filtros usados" fica em **localStorage** por página (`filters:last:<page_key>:<user_id>`). Não precisa ir ao banco — mais rápido e não polui o cache.

### 2. Hook reutilizável

`src/hooks/useFilterPresets.ts`:

- `presets`, `loading`, `defaultPreset`
- `savePreset(nome, filtros, { asDefault })`
- `updatePreset(id, patch)`
- `deletePreset(id)`
- `setDefault(id | null)`
- `lastFilters` + `saveLastFilters(filtros)` (localStorage)

### 3. Componente de UI

`src/components/filters/FilterPresetBar.tsx` — barra compacta a ser plugada no topo dos filtros de cada tela:

- Dropdown "Filtros salvos" com lista + ícone estrela indicando o padrão.
- Botões: **Salvar como…** (dialog: nome + checkbox "Definir como padrão ao abrir"), **Atualizar atual**, **Definir como padrão**, **Excluir**.
- Recebe `pageKey`, `currentFilters` e `onApply(filtros)`.

### 4. Integração nas telas

**Balanço Patrimonial** (`src/pages/contabilidade/BalancoPatrimonialPage.tsx`)
- Renderiza `<FilterPresetBar pageKey="balanco-patrimonial" />` acima do `FilterPanel`.
- Ao montar: se houver `is_default`, aplica; senão aplica `lastFilters` (se houver); senão mantém os defaults atuais.
- Ao clicar em Pesquisar: `saveLastFilters(filters)`.

**DRE Studio → Visualização** (`src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`)
- Mesmo componente com `pageKey="dre-studio-visualizacao"`.
- Filtros salvos: empresa, filial, período (dataIni/dataFim), centro de custo, modo do balanço, visão (REAL/ORC/VARV/VARP/COMP), aplicar referência Senior, meses visíveis, e demais estados do painel de filtros.
- Aplicação idêntica: default > últimos > vazio.

### 5. Comportamento resumido

- **Últimos filtros**: silenciosos, restaurados sempre ao abrir se não houver preset padrão.
- **Presets nomeados**: criados/aplicados manualmente; padrão marcado com estrela.
- Só o próprio usuário vê seus presets (RLS).

### Arquivos a criar/editar

Novos:
- Migração da tabela `bi_user_filter_presets` (+ policies, grants, trigger de default único).
- `src/hooks/useFilterPresets.ts`
- `src/components/filters/FilterPresetBar.tsx`
- `src/components/filters/SaveFilterPresetDialog.tsx`

Editados:
- `src/pages/contabilidade/BalancoPatrimonialPage.tsx` — plug do FilterPresetBar + auto-apply.
- `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` — idem + coletar/aplicar o snapshot completo de filtros.