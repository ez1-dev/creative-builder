## Problema

Os valores oficiais da folha Jan–Jun/2026 são:

| Métrica | Valor esperado |
|---|---|
| Provento | R$ 2.355.286,61 |
| Desconto | R$ 1.240.971,46 |
| Total Líquido | R$ 1.114.315,15 |

A tela **01 — Resumo Folha** hoje consome apenas `GET /api/rh/resumo-folha/dashboard`, e o backend está devolvendo `kpis` com valores diferentes. Como a fonte “linha a linha” (`GET /api/rh/resumo-folha`) já existe e é a base contábil correta da folha, vamos passar a usá-la como **fonte de verdade dos KPIs** e manter o endpoint de dashboard apenas como complemento (séries mensais e quebra por filial, quando vierem).

## Mudanças

### 1. `src/lib/rh/api.ts`
- Adicionar `aggregateKpisFromLinhas(itens: ResumoFolhaItem[]): ResumoFolhaKpis` que soma a partir das linhas normalizadas:
  - `provento` = soma de `provento` (ou `valor_evento` quando `tipo_evento` começa com `P`).
  - `desconto` = soma de `desconto` (ou `valor_evento` quando `tipo_evento` começa com `D`).
  - `total_liquido` = `provento − desconto`.
  - `inss_total`, `hora_extra`, `custo_ferias`, `fgts`, `beneficios`, `rescisoes`, `provisoes` derivados via regex sobre `descricao_evento` (reaproveitar `eventoBuckets.ts`).
  - `custo_total` = `provento + encargos (INSS patronal + FGTS + provisões)` quando disponíveis; senão = `provento`.
- Adicionar `buildProventosDescontosFromLinhas(itens)` (top eventos agrupados por `descricao_evento`).
- Adicionar `buildFiliaisFromLinhas(itens)` e `buildTiposEventoFromLinhas(itens)`.
- Nova função `fetchResumoFolhaConsolidado(p)` que:
  1. Sempre busca `/api/rh/resumo-folha` (verdade) e calcula KPIs/tabelas client-side.
  2. Em paralelo, tenta `/api/rh/resumo-folha/dashboard` (best-effort, sem quebrar em 404/500) só para pegar `mensal` e, se faltar, `filiais`.
  3. Retorna um `ResumoFolhaDashboard` mesclado, marcando `fonte: "linhas" | "dashboard" | "misto"`.

### 2. `src/pages/rh/ResumoFolhaPage.tsx`
- Trocar `fetchResumoFolhaDashboard` por `fetchResumoFolhaConsolidado`.
- Remover o banner “Endpoint de dashboard da folha ainda não disponível” (deixar de bloquear, pois agora a página funciona sem o endpoint).
- Adicionar pequeno indicador discreto no rodapé: “Fonte: linhas da folha (Jan–Jun/2026: N lançamentos)”.
- Manter cards, tabelas Proventos/Descontos, Filial e Tipos de Evento exatamente como estão hoje.

### 3. `src/lib/rh/eventoBuckets.ts`
- Expor helpers já existentes (`classificarEvento`, regex de hora extra, férias, INSS, FGTS, benefícios, rescisão, provisão) para uso pelo agregador.
- Se já existirem com esses nomes, reaproveitar sem mudar.

### 4. Documentação
- Atualizar `docs/backend-rh-resumo-folha-dashboard.md` informando que o frontend agora prioriza a agregação por linhas e o endpoint `/dashboard` é opcional (apenas `mensal` + `filiais`).

## Validação

Após implementar, abrir `/rh/resumo-folha` com `Jan/2026 → Jun/2026` e conferir:
- Provento = `2.355.286,61`
- Desconto = `1.240.971,46`
- Total Líquido = `1.114.315,15`

Se houver pequena divergência, comparar via console (`[RH ResumoFolha] amostra`) quais `tipo_evento` foram classificados como provento/desconto e ajustar a regra. Nenhuma mudança de backend é necessária.
