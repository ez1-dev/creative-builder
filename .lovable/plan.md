## Objetivo

Adaptar a página `BI Comercial` (`/bi/comercial`) para funcionar bem em celular, tablet e desktop, sem perder nenhuma funcionalidade existente (edição, drill, IA, sincronizações).

Hoje a página assume largura desktop: barra de ações com ~10 botões em linha única, FilterBar com `min-width` fixo e, principalmente, o grid de widgets usa `react-grid-layout` legacy com `cols={12}` fixo — em telas pequenas os blocos ficam ilegíveis ou cortados.

## Mudanças

### 1. `src/pages/bi/ComercialPage.tsx` — header e filtros
- Envolver as ações do `PageHeader` em um container `flex flex-wrap gap-2 justify-end` para os botões quebrarem linha em telas estreitas.
- Em mobile (`md:hidden`) agrupar os botões secundários (Biblioteca BI, Sincronizar clientes/produtos/revendas, cor de fundo) dentro de um menu "Mais ações" (DropdownMenu existente do shadcn). Em `md:` para cima continua igual.
- Botão "Atualizar" e "Editar dashboard" permanecem sempre visíveis; os textos viram só ícone em `< sm` (mantendo `title` para acessibilidade).
- FilterBar: trocar os `min-w-[180px]/[140px] flex-1` por classes responsivas (`w-full sm:min-w-[160px] sm:flex-1`) e adicionar `flex-wrap gap-2`. Botão "Aplicar" vira `w-full sm:w-auto`.
- Chips de filtros ativos já usam `flex-wrap` — apenas garantir `text-[11px] sm:text-xs` e que o botão "Limpar filtros" não force overflow (`ml-auto` → `sm:ml-auto`).

### 2. `src/components/passagens/PassagensLayoutGrid.tsx` — grid responsivo
Esse componente é compartilhado, então a mudança beneficia tudo que reusa (Passagens, Comercial, Programação).
- Trocar `import GridLayout, { WidthProvider }` por `import { Responsive, WidthProvider }` de `react-grid-layout/legacy`.
- Configurar:
  - `breakpoints={{ lg: 1200, md: 900, sm: 640, xs: 0 }}`
  - `cols={{ lg: 12, md: 12, sm: 6, xs: 2 }}`
  - `layouts={{ lg: layoutItems, md: layoutItems, sm: collapseToCols(layoutItems, 6), xs: collapseToCols(layoutItems, 2) }}`
- Helper `collapseToCols(items, cols)` (novo, no mesmo arquivo): cada widget vira `w = cols` e empilha verticalmente (`x=0`, `y` incremental), preservando `h` original. Garante leitura linear no celular sem quebrar drag/resize quando o usuário voltar ao desktop (só o layout `lg`/`md` é persistido — ver próximo item).
- `onLayoutChange` continua salvando só o layout do breakpoint atual quando for `lg` ou `md`; em `sm`/`xs` ignora persistência (`if (breakpoint === 'sm' || breakpoint === 'xs') return;`) para não sobrescrever a configuração desktop do usuário.
- Em `sm`/`xs` forçar `isDraggable={false}` e `isResizable={false}` (edição de layout só faz sentido no desktop). Banner discreto "Edição de layout disponível em telas maiores" quando `editing && breakpoint in {sm,xs}`.

### 3. Toques finais de CSS
- `src/pages/bi/ComercialPage.tsx` wrapper: trocar `-m-4 p-4 md:-m-6 md:p-6` por `-m-2 p-2 sm:-m-4 sm:p-4 md:-m-6 md:p-6` para ganhar área útil no celular.
- KPIs e charts já são responsivos via `recharts ResponsiveContainer`; apenas garantir altura mínima 220px no mobile (CSS no widget frame: `min-h-[220px]`).

### 4. Validação
- Testar via `preview_ui--set_preview_device_viewport` em `mobile`, `tablet`, `desktop`:
  - header não quebra layout, botões acessíveis;
  - filtros empilham e o "Aplicar" cobre largura;
  - widgets empilham 1 por linha no mobile, 2 por linha em `sm`, layout salvo do usuário em `md`+;
  - edição de dashboard fica desabilitada com aviso no mobile.

## Fora de escopo
- Não altera Drill Drawer, AI Chart Generator nem lógica de dados.
- Não muda os outros dashboards (Passagens/Programação) além do ganho herdado do grid responsivo.
