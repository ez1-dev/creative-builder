## Compactar sidebar e recuar submenus

Deixar os grupos e itens mais próximos verticalmente e aplicar recuo visual claro nos submenus (como no exemplo da imagem: "Ordens de Produção", "Apontamentos", "Roteiros & Operações", "Projetos" com hierarquia visível abaixo de "Produção").

### Mudanças em `src/components/AppSidebar.tsx`

1. **Reduzir espaçamento vertical dos grupos**
   - No `CollapsibleTrigger` dos grupos principais (Favoritos e demais): trocar `py-2` por `py-1.5` para aproximar os títulos.
   - No `SidebarGroup` (wrapper), garantir `space-y-0` / remover margem extra padrão do shadcn se estiver empurrando.

2. **Reduzir altura dos itens**
   - No `SidebarMenuButton` do `renderItemRow`: trocar `min-h-[34px]` por `min-h-[30px]` e ajustar padding para itens mais compactos.

3. **Recuar submenus com indicador visual**
   - Nos subgrupos (`prod-visao`, `prod-planejamento`, etc.): adicionar `pl-2` no `CollapsibleContent` e uma **borda esquerda sutil** (`border-l border-sidebar-border/40 ml-4`) no wrapper dos itens do subgrupo, criando o efeito de "árvore" recuada visto na imagem.
   - Os itens dentro do subgrupo recebem `pl-3` adicional para reforçar a hierarquia.

4. **Grupos sem subgrupo (ex: Produção da imagem)**
   - Quando um grupo tem apenas `items` (sem `subGroups`), aplicar o mesmo recuo com borda esquerda no `SidebarMenu` interno, para que os filhos diretos (ex: "Consulta de Estoques", "Estoque Min/Max") apareçam recuados abaixo do título do grupo, igual à imagem de referência.

5. **Nenhuma mudança** em rotas, ordenação, permissões, favoritos ou labels.

### Resultado esperado
- Sidebar mais densa (economia ~20% de altura vertical).
- Hierarquia visual clara: título do grupo → filhos recuados com linha guia à esquerda → subgrupos ainda mais recuados.
