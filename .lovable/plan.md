## Estado atual

A tela já chama:
- `/api/rh/resumo-folha/dashboard?modo=acumulado` para os cards (KPIs/tabelas).
- `/api/rh/resumo-folha/dashboard?modo=mensal` para os gráficos.

Mas o tipo `ResumoFolhaMensalAgg` só conhece `competencia`, `custo_hora_extra` e `custo_mensal` — não há suporte a `provento`, `desconto` e `liquido` por mês, então a série mensal não exibe os valores que o usuário listou (Jan–Jun/2026 por competência).

## Mudanças

### 1. `src/lib/rh/types.ts`
Adicionar campos opcionais em `ResumoFolhaMensalAgg`:
```
provento?: number; desconto?: number; total_liquido?: number;
```

### 2. `src/lib/rh/api.ts` — `normalizeDashboard`
Ao mapear `mensal[]`, normalizar também `provento`, `desconto`, `total_liquido` (com aliases `liquido`).

### 3. `src/pages/rh/ResumoFolhaPage.tsx`
Substituir os mini-gráficos atuais ("Custo Hora Extra" / "Custo Mensal") por uma seção **"Evolução mensal"** dedicada com:

- Gráfico de barras agrupado por competência (`formatCompetencia`) com 3 séries: Provento (primary), Desconto (destructive), Líquido (success). Tooltip em BRL.
- Logo abaixo, **tabela mensal** com colunas: Competência | Provento | Desconto | Líquido, footer somando as 3 colunas (que devem bater com os cards acumulados).
- Manter mini-gráfico de Hora Extra como card auxiliar separado (continua usando `custo_hora_extra`).

Os cards de KPI continuam lendo apenas `queryAcumulado.data.kpis` — nenhum valor mensal entra ali.

### 4. `docs/backend-rh-resumo-folha-dashboard.md`
Atualizar contrato de `mensal[]` para incluir `provento`, `desconto`, `total_liquido` por item, com exemplo Jan–Jun/2026.

## Validação

Abrir `/rh/resumo-folha` com Jan/2026 → Jun/2026:

- **Cards (acumulado):** Provento 15.009.216,13 · Desconto 7.777.378,54 · Líquido 7.231.837,59.
- **Tabela mensal:** 6 linhas batendo exatamente com os valores informados (202601→202606); rodapé soma = cards.
- **Gráfico mensal:** 6 trios de barras (Provento/Desconto/Líquido).
