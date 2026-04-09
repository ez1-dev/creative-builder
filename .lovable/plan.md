

# Corrigir drill-down para usar dados consolidados (todas as páginas)

## Problema

Os KPI values são consolidados buscando todas as páginas em background, mas os drill-downs usam apenas `data.dados` (página atual). Isso causa inconsistencia: o KPI mostra o total geral, mas o drill-down mostra apenas os top da página visível.

## Solução

Acumular todos os registros de todas as páginas durante a consolidacao e usar esse dataset completo para gerar os drill-downs.

## Implementacao

### Paginas afetadas

1. **ProduzidoPeriodoPage** — 4 KPIs
2. **ExpedidoObraPage** — 4 KPIs
3. **SaldoPatioPage** — 4 KPIs

O **PainelComprasPage** nao tem consolidacao multi-pagina (usa `data.resumo` do backend), entao o drill-down da pagina atual e adequado.

### Mudancas em cada pagina (mesmo padrao)

1. Adicionar state `allDados` (`useState<any[]>([])`) para armazenar todos os registros consolidados
2. No `consolidateKpis`, alem de somar os totais, concatenar `dados` de cada pagina no array `allDados`
3. Alterar o `drillDetails` useMemo para usar `allDados` quando disponivel, com fallback para `data.dados`
4. No `clearFilters`, resetar `allDados` para `[]`
5. Adicionar indicador no subtitle do KPI: "Top da pagina" vs "Top geral do filtro" conforme o estado

### Limites de memoria

Manter o limite existente de consolidacao (max ~50 paginas / 5.000 registros) para nao sobrecarregar o navegador. O `allDados` so armazenara os registros que ja sao buscados para consolidacao dos KPIs.

### Arquivos modificados
- `src/pages/producao/ProduzidoPeriodoPage.tsx`
- `src/pages/producao/ExpedidoObraPage.tsx`
- `src/pages/producao/SaldoPatioPage.tsx`

