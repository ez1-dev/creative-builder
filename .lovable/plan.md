

## Drill-down nos KPIs da Auditoria Apontamento Genius

### Escopo
Habilitar popover de detalhamento (`details`) nos 9 KPIs da tela `/auditoria-apontamento-genius`, agregando linhas relevantes da página atual. O `KPICard` já tem suporte nativo a `details` (Popover com até N itens) — basta alimentar.

### Mudanças

**Arquivo único:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. **Novo `useMemo` `kpiDrilldowns`** (após `atualizarKpisApontGenius`)
   - Itera `data?.dados` e produz, para cada KPI, uma lista `{ label, value }` (até 15 itens, ordenada por relevância).
   - Mapeamento KPI → conteúdo do popover:

| KPI | Label | Value |
|---|---|---|
| **Total Registros** | `Origem {origem}` | qtd registros (top 10 origens) |
| **OPs em andamento** | `OP {numop}` | `{produto}` (top 15 OPs únicas com status ativo) |
| **OPs finalizadas** | `OP {numop}` | `{produto}` (top 15 OPs únicas finalizadas) |
| **Discrepâncias** | `OP {numop} · {operador}` | label do status (Aberto/Divergente/Alerta) |
| **Sem Início** | `OP {numop} · {operador}` | `{data} {hora}` |
| **Sem Fim** | `OP {numop} · {operador}` | `{data} {hora}` |
| **Fim < Início** | `OP {numop} · {operador}` | `{horas_realizadas}h` |
| **Acima de 8h** | `{operador}` | `{horas}h` (ordenado desc por horas; deduplica operador+OP) |
| **Maior Total Dia** | `{operador}` | `{total_dia}h` (top 10 maiores totais do dia) |

   - Para OPs únicas, deduplicar por `numero_op` mantendo a primeira ocorrência.

2. **Passar `details` para cada `<KPICard>`** (linhas 588-603)
   - Cada card recebe `details={kpiDrilldowns.totalRegistros}` etc.
   - Manter mesmo cabeçalho/ícones/variantes atuais.
   - Não passar `details` se a lista resultante for vazia (popover não abre — comportamento natural do componente).

3. **Aviso de escopo no popover**
   - Adicionar prop `tooltip` curta nos cards quando `discrepanciasParciais` for `true` para os 6 KPIs de discrepância: `"Detalhamento da página atual"`. Isso aparece no header do Popover (já suportado pelo `KPICard`).
   - Para KPIs estruturais (`Total Registros`, `OPs em andamento/finalizadas`), tooltip fixa: `"Top da página atual"`.

4. **Nada muda no `StatusOpGeniusCard`** (drill-down já existente lá, fora de escopo).

### Comportamento resultante
- Clique em qualquer KPI abre Popover com lista detalhada (até 15 itens) das linhas que contribuíram para o número.
- Cursor vira pointer e card ganha hover (já implementado no `KPICard` quando `details` está presente).
- Listas são derivadas da página atual carregada — coerente com o aviso de fallback existente.

### Fora de escopo
- Buscar todas as páginas para drill-down global.
- Modal de detalhe expandido (continua usando o Popover compacto existente).
- Drill-down navegando para tela filtrada.

### Resultado
Usuário clica em qualquer KPI e vê imediatamente quais OPs/operadores/origens contribuíram para o número, sem precisar caçar na tabela.

