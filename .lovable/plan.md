# Filtro de Meses na DRE

Adicionar filtro de meses (seleção múltipla) ao `src/pages/bi/contabilidade/DrePage.tsx`. Mudança 100% frontend — a RPC `bi_dre_matriz_anual` continua retornando todos os 12 meses, e o frontend apenas oculta as colunas não selecionadas e recalcula a coluna TOTAL.

## Alterações

**`src/pages/bi/contabilidade/DrePage.tsx`**

1. Novo estado `mesesSelecionados: string[]` — default todos os 12 meses (`['jan',...,'dez']`).
2. Novo controle de filtro ao lado de Unidade: dropdown popover com checkboxes (um por mês + "Todos" / "Limpar"). Usa `Popover` + `Checkbox` do shadcn já disponíveis. Label do botão: "Meses (N)" mostrando contagem.
3. Derivar `MESES_VISIVEIS` filtrando o array `MESES` atual pelos selecionados, mantendo sempre o item `total` ao final.
4. Recalcular a coluna TOTAL no frontend para cada linha: `total_realizado = soma(realizado dos meses visíveis)`, idem `total_orcado`. Para `total_av`, recomputar como `total_realizado_linha / total_realizado_da_linha_RECEITA_LIQUIDA * 100` (mesma lógica da RPC).
5. KPIs (Receita Bruta, Lucro Bruto, EBITDA, Lucro Líquido) passam a usar esses totais recalculados em vez de `total_realizado` cru da RPC, para refletir o filtro.
6. Cabeçalho e linhas iteram sobre `MESES_VISIVEIS` em vez de `MESES`. `colSpan`/contagem de colunas vazias ajustados automaticamente.

## Fora de escopo

- Mudar a RPC ou migrações.
- Persistir seleção entre sessões.
- Filtrar dados no backend (segue retornando 12 meses).
