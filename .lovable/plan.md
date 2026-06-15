# Ajuste DrePage — matriz mensal pura

## Objetivo
Alinhar `src/pages/bi/contabilidade/DrePage.tsx` para consumir exclusivamente a RPC `public.bi_dre_matriz_anual` e renderizar a tabela conforme o layout pedido, sem cálculos locais de TOTAL.

## Mudanças

1. **Chamada RPC** — manter exatamente:
   ```ts
   supabase.rpc('bi_dre_matriz_anual', {
     p_ano: anoSelecionado,
     p_unidade_negocio: unidadeSelecionada || null,
   })
   ```
   Remover qualquer fallback/uso de `bi_dre`.

2. **Coluna fixa à esquerda**: exibir apenas `descricao` (remover o chip `codigo_linha`). Cabeçalho passa a ser **"Máscara"** (com `rowSpan={2}`), `sticky left-0`.

3. **Ordenação**: `linhas.sort((a,b) => (a.ordem ?? 0) - (b.ordem ?? 0))`.

4. **Cabeçalho agrupado** (2 linhas):
   - Linha 1: Máscara | Janeiro | Fevereiro | … | Dezembro | TOTAL (cada mês com `colSpan={3}`)
   - Linha 2: Realizado | A.V. | Orçado (repetido para cada mês + TOTAL)
   - Coluna TOTAL com destaque visual (`bg-primary/15`)

5. **Células de dados** — ler diretamente da RPC:
   - Mês: `l['<mes>_realizado']`, `l['<mes>_av']`, `l['<mes>_orcado']`
   - TOTAL: `l.total_realizado`, `l.total_av`, `l.total_orcado` (sem recalcular)

6. **Formatação**:
   - Realizado/Orçado: `formatCurrency` (BRL); negativos entre parênteses e em `text-destructive`
   - A.V.: `formatPercent`; negativos em vermelho
   - Manter helpers `fmtSigned` / `fmtSignedPct` e `negClass` já existentes

7. **Scroll**: container `overflow-auto` (já existe); coluna descrição `sticky left-0 z-20` com fundo opaco; cabeçalho `sticky top-0`.

8. **Remoções**:
   - State `mesesSel`, `mesesVisiveis`, `toggleMes`, Popover/Checkbox de meses, import `Calendar` e `Checkbox`/`Popover*` se não usados em outro lugar
   - `useMemo` que recalcula `total_realizado`/`total_orcado`/`total_av` por linha
   - Filtro `meses` passado para `PageDataProvider`

9. **Linhas totalizadoras**: manter destaque (`bg-primary/10 font-semibold`) via `CODIGOS_TOTALIZADORES` (RECEITA_LIQUIDA, LUCRO_BRUTO, EBITDA, EBIT, RESULTADO_EXERCICIO).

10. **KPIs superiores**: mantidos, lendo `total_realizado`/`total_av` da RPC para `RECEITA_BRUTA`, `LUCRO_BRUTO`, `EBITDA`, `RESULTADO_EXERCICIO` via `findByCodigo`.

## Fora de escopo
- Alterações na RPC ou migrações
- Drill-down, gráficos antigos, exportação
- Filtro de meses (removido conforme novo requisito de usar TOTAL direto da RPC)
