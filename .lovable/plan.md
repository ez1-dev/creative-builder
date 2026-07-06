## Objetivo

Nas páginas RH em modo "Editar layout":
- botão **Adicionar da Biblioteca BI** no toolbar (novo card custom),
- botão **Configurar** (engrenagem) em cada card, permitindo trocá-lo por um componente da Biblioteca BI.

Aplicar em todas as páginas RH: Resumo Folha, Quadro Colaboradores, Absenteísmo, Contrato Experiência, Turnover, Programação Férias.

## Alterações

### 1. `src/hooks/useRhModuleLayout.ts`
- Novo `addWidget({ componentId, mapping, options, title })`: gera `type = "custom-<Date.now()>"`, layout default `{ x:0, y:9999, w:6, h:4 }`, chama `saveLayout` — react-grid compacta ao renderizar.
- Expor no retorno.

### 2. `src/components/rh/AddRhBiWidgetDialog.tsx` (novo)
Diálogo simples baseado na aba "library" de `AddBiWidgetDialog`:
- Selecionar componente do `COMPONENT_REGISTRY`.
- Selects para `series` e `valueKey` lidos do `usePageData()` da página (kpis/series disponíveis).
- Input de título.
- Botão "Adicionar" → chama `onAdd({ componentId, mapping, title })`.

### 3. `src/components/rh/ConfigureRhWidgetDialog.tsx` (novo)
Versão enxuta de `ConfigureBiWidgetDialog` (modo "Biblioteca BI"):
- Se widget custom: obrigatório escolher componente.
- Se widget canônico: aba "Padrão" (limpar substituição) + aba "Biblioteca BI" (definir componentId/mapping).
- Selects de series/valueKey a partir de `usePageData()`.
- Título custom opcional.
- Botão "Salvar" → `onSave({ componentId, mapping, customTitle })`.
- Botão "Excluir" (apenas custom) → chama `onDelete(type)` que remove o registro em `dashboard_widgets`.

### 4. `src/components/rh/RhLayoutToolbar.tsx`
- Nova prop `onAdd(payload)` (opcional).
- Botão "Adicionar da Biblioteca BI" (ícone `Plus`), visível apenas quando `editing`.
- Abre `AddRhBiWidgetDialog`.

### 5. `src/components/rh/RhDashboardGrid.tsx`
- Nova prop `pageDataAware?: boolean` (default false p/ compat).
- Se `w.componentId` estiver setado: renderizar `getComponent(componentId).render({ title, mapping, options: { ...options, filtros: ctx.filtros }, ctx: { kpis, series, rows } })` via `usePageData()`, dentro de `WidgetErrorBoundary`.
- Caso contrário, cair no `blocks[w.type]` existente.
- Passar `onConfigure`, `configurableTypes` para `PassagensLayoutGrid` sem alteração (já suportado). `configurableTypes` = todos os `w.type` não-custom (default catalog) + todos os `custom-*`.

### 6. Cada página RH (`src/pages/rh/*.tsx`)
- Envolver a área do grid com `PageDataProvider` com `pageKey` por módulo (`rh-resumo-folha`, `rh-quadro`, `rh-absenteismo`, `rh-contrato-experiencia`, `rh-turnover`, `rh-programacao-ferias`), fornecendo `kpis`, `series`, `rows`, `filtros` já disponíveis na página.
- Manter estado local `configTarget: RhWidget | null`; passar `onConfigure={(type) => setConfigTarget(byType[type])}` para `RhDashboardGrid` e renderizar `<ConfigureRhWidgetDialog>` controlado.
- Passar `onAdd` ao `RhLayoutToolbar` que chama `layout.addWidget(payload)`.
- Passar `onDelete={(type) => layout.deleteWidget(type)}` para o grid (já suportado no PassagensLayoutGrid via `onDelete`); adicionar `deleteWidget` em `useRhModuleLayout` (delete direto em `dashboard_widgets` por id).

### 7. `src/lib/bi/pageRegistry.ts`
- Registrar as 6 páginas RH com `schema.kpis` e `schema.series` mínimos (nomes das chaves que cada página expõe em seu `PageDataProvider`). Sem isso, os selects do dialog ficam vazios.

## Fora de escopo
- Não mexer no backend/API RH.
- Não portar toda a UI de `ConfigureBiWidgetDialog` (cores, séries múltiplas, HeatMap, etc.). Somente troca por componente da Biblioteca BI + mapping básico.
- Não alterar `PassagensLayoutGrid`.

## Riscos
- Cada página precisa expor kpis/series de forma estável — se um componente esperar chave inexistente, mostra warning em DEV e renderiza vazio (comportamento já implementado em `UserWidgetsSlot`).