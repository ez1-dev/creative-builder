## Problema

Hoje a tela **Personalizar Menus** usa `effectiveMenus`, que é o mesmo layout aplicado à sidebar — ou seja, itens/submenus/menus marcados como "não visíveis" **somem** da lista. Consequência: quando o usuário oculta algo, ele perde a forma de reativar pela UI (só resta "Restaurar padrão", que apaga tudo).

## Objetivo

No editor, **sempre listar tudo** (fábrica + customizados), mas renderizar em estado "desativado" (visual esmaecido + badge "oculto") os itens/subgrupos/menus de topo cuja visibilidade está desligada. O Switch "Visível" continua sendo o meio de reativar.

## Mudanças

### 1. `src/hooks/useMenuLayout.tsx`
- Extrair a lógica de aplicação **sem filtrar por `hidden`/`hiddenGroups`** para uma função `applyLayoutForEditor(baseMenus, layout)` (ou parâmetro `{ keepHidden: true }` em `applyLayout`).
  - Mantém: merge de customTops/customSubGroups/customItems, moves, renames, icons e ordering.
  - Não aplica: `hidden.has(url)` nos itens nem `hiddenGroups.has(...)` nos tops/subgrupos.
- Expor pelo hook um novo campo `editorMenus: TopMenu[]` (derivado com essa variação), sem afetar `effectiveMenus` (que continua sendo o filtrado que a sidebar consome).

### 2. `src/pages/PersonalizarMenusPage.tsx`
- Trocar `effectiveMenus.map(renderTop)` por `editorMenus.map(renderTop)`.
- Em `renderTop`:
  - Se `topHidden`, adicionar classe `opacity-60` no `Card` e badge `Oculto` ao lado do nome.
- Em cada subgrupo nested:
  - Se `subHidden`, aplicar `opacity-60` no bloco do subgrupo e badge `Oculto`.
- Em `renderRow`:
  - Se `hidden`, aplicar `opacity-60` na linha inteira e badge `Oculto`.
- Nenhum outro comportamento muda — o Switch "Visível" já alterna `hidden`/`hiddenGroups` e continua funcionando para reativar.

### 3. Sem mudanças em
- Sidebar (`AppSidebar.tsx`) — continua consumindo `effectiveMenus` filtrado.
- Schema do layout no Cloud — nada a migrar.
- Permissões / RLS.

## Resultado esperado

Ao ocultar "BI Comercial" no editor, ele passa a aparecer esmaecido com badge "Oculto" na própria página de Personalizar Menus, permitindo reativar com um clique no Switch. Na sidebar do app continua sumindo normalmente.
