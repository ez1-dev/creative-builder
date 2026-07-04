## Ajustar labels dos grupos para não quebrar linha

Na captura, o grupo **"Comercial / Faturamento"** quebra em duas linhas e fica centralizado (por causa do `justify-between` do trigger), destoando dos demais.

### Mudanças em `src/components/AppSidebar.tsx`

1. **Encurtar label** do grupo `comercial`: `"Comercial / Faturamento"` → `"Comercial"` (o subitem "Faturamento Genius" já deixa o escopo claro).
2. **Prevenir quebra em qualquer grupo futuro:** adicionar `truncate whitespace-nowrap min-w-0` no `<span>` do título dentro de `CollapsibleTrigger` (grupo e subgrupo), garantindo que labels longas sejam cortadas com reticências em vez de quebrar em duas linhas.
3. Nenhuma outra mudança de rota, permissão, tipografia ou ordenação.
