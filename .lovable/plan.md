## Objetivo
Modernizar a tipografia do menu lateral, dando cara de ERP web atual (mais respiro, hierarquia clara, fontes um pouco maiores e mais legíveis) sem mexer em filtros, rotas, dados ou lógica.

## Mudanças (apenas visuais em `src/components/AppSidebar.tsx`)

**Header do sidebar**
- Ícone do logo: `h-5 w-5` → `h-6 w-6`
- Título "ERP Sapiens": `text-sm font-bold` → `text-[15px] font-semibold tracking-tight`
- Padding: `px-4 py-3` → `px-4 py-4`
- Input de busca: altura `h-8` → `h-9`, fonte `text-xs` → `text-sm`, ícone `h-3.5` → `h-4`

**Cabeçalho de grupo (accordion principal)**
- `text-xs font-medium` → `text-[13px] font-semibold tracking-wide`
- Cor: `text-sidebar-foreground/70` → `text-sidebar-foreground/80`
- Padding: `px-2 py-1.5` → `px-3 py-2`
- Ícone do grupo: `h-4 w-4` → `h-[18px] w-[18px]`
- Chevron: `h-3 w-3` → `h-3.5 w-3.5`

**Sub-grupo (Visão Geral, Planejamento, etc.)**
- `text-[11px]` → `text-[12px] font-medium uppercase tracking-wider`
- Padding: `px-4 py-1` → `px-4 py-1.5`

**Item de menu (linhas clicáveis)**
- Ícone: `h-4 w-4` → `h-[18px] w-[18px]`, margem `mr-2` → `mr-2.5`
- Texto: aplicar `text-[13.5px]` no span do título (hoje herda tamanho default do botão que fica visualmente pequeno)
- Altura mínima confortável: adicionar `min-h-[34px]` no `SidebarMenuButton` para dar respiro
- Estado ativo mantém `bg-primary/15 text-primary font-medium`

**Label "Favoritos"**
- `text-[10px]` → `text-[11px] font-semibold`

**Grupo "Outros (legado)"**
- Mesma escala do label de sub-grupo (`text-[12px] uppercase tracking-wider`)

## Não muda
- Estrutura do menu, ordem, ícones semânticos, permissões
- Comportamento de accordion exclusivo, busca, favoritos
- Modo colapsado (só ícones) continua igual
- Nenhum outro componente/página é tocado
