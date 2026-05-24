## Alterar KPI "Sem mapeamento" no Dashboard de Carga

### Mudanças em `src/pages/producao/CargaDashboardPage.tsx` (KPI card)

1. **Título**: trocar "Sem mapeamento" por "Classificados por regra automática".
2. **Tooltip**: adicionar tooltip (via prop `tooltip`/`info` do `KpiCard`, ou ícone `Info` do lucide com `Tooltip` do shadcn) com o texto:
   > "Quantidade de linhas de carga em que o recurso não possui mapeamento explícito na API, mas foi classificado automaticamente por centro de custo ou origem da OP."
3. **Remover ênfase de erro**: tirar qualquer `variant="destructive"`, cor `text-destructive`, ícone de alerta ou badge vermelho associado ao card. Usar o estilo neutro padrão (mesmo dos demais KPIs informativos).
4. **Manter** o comportamento de drill-down existente (sheet lateral filtrando `origem_mapeamento: 'PADRAO_API'`) — apenas o rótulo/visual muda, a métrica e o filtro permanecem iguais.

### Verificação
- Conferir se `KpiCard` já suporta prop de tooltip; se não, estender minimamente o componente em `src/components/producao/carga-dashboard/KpiCard.tsx` para aceitar `tooltip?: string` e renderizar ícone `Info` com `TooltipProvider`/`Tooltip` do shadcn.
- Garantir tokens semânticos do design system (sem cor hardcoded).

Sem mudanças de backend, rotas ou lógica de filtro.