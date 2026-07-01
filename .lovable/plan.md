## Situação atual

Os três cards já estão mapeados 1:1 com a API, sem cálculo no front e sem converter `null` em `R$ 0,00`:

- `src/lib/rh/api.ts` — `KPI_ALIASES` lê `custo_total`, `beneficios`, `rescisoes` diretamente de `response.kpis.*` (sem somar componentes).
- `src/pages/rh/ResumoFolhaPage.tsx` — `KpiOrMissing` renderiza o valor quando presente e "Campo pendente na API" quando `null/undefined`.

Assim que a API entregar os números, os três cards saem automaticamente do estado pendente — não é necessária nenhuma alteração de código.

## Confirmação necessária

Antes de abrir um plano de alteração, preciso confirmar o que você quer:

1. **Nada a fazer** — só validar que o mapeamento está correto (é o caso atual).
2. **Ajuste visual** — por exemplo, badge "Em validação técnica" no card Custo Total / Benefícios / Rescisões (como fizemos em Custo das Férias) enquanto a API estabiliza.
3. **Outros aliases** — a API está retornando com um nome diferente (ex.: `custo_total_geral`, `beneficios_total`, `rescisao`) e os cards continuam pendentes mesmo com valor no payload.

Se for a opção 3, me envie um trecho do JSON de `response.kpis` para eu adicionar o alias correto em `KPI_ALIASES`.