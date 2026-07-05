## Ajustes de tipografia dos submenus da sidebar

Alvo: `src/components/AppSidebar.tsx` (apenas apresentação, sem mudar rotas/permissões/ordem).

### Mudanças

1. **Remover ícones dos itens filhos** (renderizados por `renderItemRow`):
   - Ocultar `<item.icon>` dentro do `NavLink`.
   - Ajustar o espaçamento à esquerda (sem `mr-2.5`) para o texto ficar alinhado à guia vertical do submenu.
   - Ícones dos **grupos principais** (Início, Produção, Comercial, etc.) e do **Favoritos** continuam visíveis — só os itens de menu perdem o ícone.

2. **Fonte uniforme e menor nos itens de submenu**:
   - Trocar `text-[13.5px]` do `<span>` do item por `text-[12.5px] font-normal`.
   - Garantir mesma família/peso em todos os níveis (sem `font-medium` nos itens; ativo mantém `text-primary` mas sem bold — remover `font-medium` do estado ativo do `NavLink`).

3. **Subgroup labels (ex.: "Visão Geral", "Planejamento", "DRE")**:
   - Uniformizar com os itens: remover `uppercase tracking-wider` e o tamanho `text-[11px]`; usar `text-[12px] font-medium` (levemente destacado só para diferenciar do item, mas mesma família e sem caixa alta).

4. **Altura/padding dos itens**: manter compactos (`min-h-[28px] py-1`), sem outras mudanças estruturais.

### Fora do escopo
- Nenhuma mudança em favoritos, busca, permissões, colapso, cores/tokens ou nos ícones dos grupos principais.
