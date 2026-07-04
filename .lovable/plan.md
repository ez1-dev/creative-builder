## Menu de Favoritos dedicado

Hoje os favoritos aparecem como um sub-bloco dentro do grupo "Início". A proposta é promovê-los a um **grupo próprio**, sempre visível no topo da sidebar, com o mesmo comportamento accordion dos demais.

### Mudanças em `src/components/AppSidebar.tsx`

1. **Novo grupo "Favoritos"** renderizado antes de todos os outros grupos:
   - Ícone: `Star` (lucide).
   - Label: "Favoritos".
   - Conteúdo: lista dos itens favoritados (via `useFavorites`), resolvidos a partir da árvore `GROUPS` (título + ícone + url originais).
   - Cada item mantém a estrela para desfavoritar (mesmo componente `renderItemRow`).
   - Se não houver favoritos, mostra um placeholder discreto ("Nenhum favorito ainda. Clique na ★ ao lado de qualquer item para adicionar.") em vez de esconder o grupo — assim o usuário descobre a funcionalidade.
   - Respeita o accordion exclusivo: abrir "Favoritos" fecha os outros; começa aberto quando há favoritos e a rota atual não pertence a outro grupo.

2. **Remoção do bloco de favoritos de dentro do grupo "Início"** (o `SidebarGroupLabel "Favoritos"` e o `SidebarMenu` de `favoriteItems` dentro de `renderGroup` quando `group.id === 'inicio'`).

3. **Modo colapsado (icon-only):** o grupo "Favoritos" mostra apenas o ícone `Star` no cabeçalho, igual aos outros grupos.

4. **Busca:** quando há query, o grupo Favoritos também é forçado aberto e filtrado por `matchesQuery`, consistente com o resto.

### Fora do escopo

- Sem mudanças em `useFavorites`, rotas, permissões, tipografia ou nos demais grupos.
- Sem drag-and-drop para reordenar favoritos (pode ser evolução futura).
