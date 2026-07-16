## Objetivo
Deixar o gráfico "Evolução mensal" (Provento / Desconto / Líquido) da página `Resumo Folha` (`/rh/resumo-folha`) com aparência moderna, mantendo os mesmos dados, tokens semânticos do design system e sem tocar em lógica de negócio.

## Escopo
- Arquivo único: `src/pages/rh/ResumoFolhaPage.tsx`, bloco `"mensal-chart"` (linhas ~306–330).
- Nada de novo endpoint, hook, tipo, tabela ou outra tela.

## Mudanças visuais
1. **Barras com gradiente vertical** (via `<defs><linearGradient>`) usando tokens:
   - Provento: `hsl(var(--primary))` → mais claro no topo
   - Desconto: `hsl(var(--destructive))` → mais claro no topo
   - Líquido: `hsl(var(--success))` → mais claro no topo
2. **Cantos arredondados** nas barras (`radius={[6,6,0,0]}`) e largura mais enxuta (`barSize` ~18, `barCategoryGap="25%"`).
3. **Grid** só horizontal, tracejado leve (`stroke="hsl(var(--border))"`, `opacity 0.4`, `vertical={false}`).
4. **Eixos** sem linha de eixo e sem tick line; fonte 11px; label do eixo Y abreviado com `tickCurrencyAbbrev` de `@/components/bi/utils/chartHelpers` (`R$ 2,8M` / `R$ 750k`) em vez do `Math.round(v/1000)+"k"` atual.
5. **Tooltip customizado** com fundo `hsl(var(--popover))`, borda `hsl(var(--border))`, raio 8, sombra sutil, título = competência, três linhas com bullet colorido + rótulo + `formatCurrency(v)` alinhado à direita, ordem Provento → Desconto → Líquido.
6. **Legenda** no topo direito, `iconType="circle"`, fonte 12, com pequeno espaçamento.
7. **Animação** de entrada mantida (default do Recharts), sem alterar comportamento; adicionar `cursor={{ fill: 'hsl(var(--muted))', opacity: 0.35 }}` no `<Tooltip>` para destaque na coluna.
8. Header do Card: manter texto "Evolução mensal", adicionar subtítulo pequeno `text-xs text-muted-foreground` com "Provento, Desconto e Líquido por competência".

## Regras respeitadas
- Somente frontend/apresentação.
- Zero cores hardcoded — todas via tokens do design system (`--primary`, `--destructive`, `--success`, `--border`, `--popover`, `--muted`, `--foreground`, `--muted-foreground`).
- Reusa helper existente `tickCurrencyAbbrev` (`@/components/bi/utils/chartHelpers`) e `formatCurrency`.
- Nenhum outro componente/página é alterado.

## Validação
- Abrir `/rh/resumo-folha`, conferir que as 3 séries continuam com os mesmos valores (comparar contra a tabela "Detalhamento mensal" logo abaixo).
- Verificar hover: tooltip novo aparece com os 3 valores.
- Conferir modo claro/escuro (tokens já cobrem).
