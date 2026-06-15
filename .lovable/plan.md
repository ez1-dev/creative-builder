# Ajuste DrePage para contrato `codigo_linha` da RPC

A página já chama `bi_dre_matriz_anual` e renderiza matriz mensal sticky. Os ajustes restantes alinham o frontend ao contrato real da RPC corrigida (que agora devolve `codigo_linha` em vez de `mascara`) e mudam o lookup dos KPIs para usar esses códigos.

## Alterações em `src/pages/bi/contabilidade/DrePage.tsx`

1. **Tipo `DreLinha`**: trocar campo `mascara` por `codigo_linha` (manter `descricao`, `ordem`; remover `totalizadora`/`nivel` se não existirem mais no retorno — manter como opcionais, sem quebrar render).
2. **Primeira coluna da tabela**:
   - Cabeçalho continua "Máscara".
   - Célula passa a mostrar `codigo_linha` no chip mono e `descricao` ao lado.
   - Remover indent por `nivel` (não está no contrato listado).
3. **Detecção de linha totalizadora** (para o destaque `bg-primary/10 font-semibold`): passar a usar `codigo_linha` em um set fixo:
   `RECEITA_LIQUIDA`, `LUCRO_BRUTO`, `EBITDA`, `EBIT`, `RESULTADO_EXERCICIO`.
4. **Base de A.V. recalculado pelo filtro de meses**: localizar a linha por `codigo_linha === 'RECEITA_LIQUIDA'` em vez de descrição.
5. **KPIs**: substituir `findLinhaByDesc` por `findByCodigo(linhas, codigo)` e mapear:
   - Receita Bruta → `RECEITA_BRUTA`
   - Lucro Bruto → `LUCRO_BRUTO`
   - EBITDA → `EBITDA`
   - Lucro Líquido → `RESULTADO_EXERCICIO`
6. **Ordenação**: aplicar `sort((a,b) => (a.ordem ?? 0) - (b.ordem ?? 0))` ao montar `linhas` (defensivo — a RPC já ordena).
7. **`PageDataProvider` rows**: continua com `linhas`.

Formatação, sticky header, filtro de Ano/Unidade/Meses, recálculo de TOTAL pelos meses selecionados e estilo de negativos (parênteses + `text-destructive`) permanecem como estão hoje.

## Fora de escopo

- Mudanças na RPC ou migrações.
- Restaurar gráficos antigos.
- Drill-down por célula.
