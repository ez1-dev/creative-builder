## Ajuste nos KPIs da aba "OPs Pintura/Jato"

A lista oficial de KPIs usa `resumo.ops_com_ciclo`, mas a implementação atual lê `resumo.ops_ciclo_bom` e rotula como "OPs Ciclo BOM". Os outros 6 campos já batem com a especificação.

### Alterações em `src/pages/auditoria-genius/OpsJatoPesoTab.tsx`

1. **Tipo `OpsJatoPesoResponse.resumo`** (em `src/lib/api.ts`): renomear `ops_ciclo_bom` → `ops_com_ciclo`.
2. **KpiGroup**: renomear o card "OPs Ciclo BOM" para **"OPs com Ciclo"**, lendo `resumo.ops_com_ciclo`.
3. **`useAiPageContext.kpis`**: trocar a chave `'OPs Ciclo BOM'` por `'OPs com Ciclo'` apontando para `resumo.ops_com_ciclo`.
4. Manter ordem dos 7 KPIs exatamente como na especificação:
   1. Total de OPs
   2. Peso Total Multinível
   3. OPs com Peso
   4. OPs sem Peso
   5. OPs com Peso Parcial
   6. OPs com Ciclo
   7. OPs sem Componentes

Nenhuma outra alteração (filtros, tabela, drawer, export) — somente nomes/campos dos KPIs.
