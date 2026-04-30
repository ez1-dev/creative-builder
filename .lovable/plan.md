## Problema

Quando o usuário clica num destino na lista "Top destinos por valor" (ou no mapa por UF), os três gráficos de baixo **não** são atualizados:

- **Evolução Mensal**
- **Por Motivo de Viagem**
- **Top 15 Centros de Custo**

KPIs, lista de registros e card de agrupamento já filtram corretamente — só os gráficos ficam estáticos.

## Causa

Em `src/components/passagens/PassagensDashboard.tsx` (linhas 309–342), os três `useMemo` chamam `applyCross(filtered, { ... })` passando apenas `mes`, `motivo` e `cc` como flags ativas. O filtro de `destino` e `uf` são ignorados na base, e ainda por cima `selectedDestino` / `selectedUF` não estão nas dependências do `useMemo`, então o React nem recalcula quando o usuário seleciona uma cidade/UF.

## Correção

Em cada um dos três gráficos:

1. Adicionar `destino: true, uf: true` à chamada `applyCross(...)` — assim cada gráfico ignora apenas seu próprio eixo (regra Power BI) mas respeita destino e UF.
2. Incluir `selectedDestino` e `selectedUF` no array de dependências do `useMemo`.

Resultado: ao clicar em "Curitiba" na lista, Evolução Mensal mostra só a evolução de Curitiba, Motivo mostra só os motivos das viagens para Curitiba, e Top 15 CC mostra só os centros de custo que tiveram passagens para Curitiba — coerente com o resto do dashboard.

## Arquivo

- `src/components/passagens/PassagensDashboard.tsx` (única mudança, ~6 linhas).
