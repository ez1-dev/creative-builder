# Formatar eixo X do gráfico "Faturamento mensal x Meta"

## Problema

No gráfico `Faturamento mensal x Meta` do BI Comercial, o eixo X mostra o `anomes_emissao` cru:
`202601, 202602, 202603, 202604, 202605, 202606`.

O usuário quer ver o nome do mês: `Janeiro, Fevereiro, Março, Abril, Maio, Junho`.

## Diagnóstico

Em `src/pages/bi/ComercialPage.tsx`:

- Linha 327: `mensal.map((m) => ({ label: m.anomes_emissao, faturamento: ..., meta: ... }))` — alimenta o widget legado.
- Linha 633: `mensal.map((m) => ({ ...m, label: m.anomes_emissao }))` — alimenta o `ComboChartCard` (que é o widget visível na imagem, `serie-mensal` variant `combo`).

O `label` é usado como categoria do eixo X. Hoje vai como string `YYYYMM`.

## Solução

1. Criar helper local `formatAnomesMes(anomes: string): string` em `ComercialPage.tsx` (ou reusar de `src/lib/format.ts` se já houver — verificar e criar lá se fizer mais sentido). Mapeia `'YYYYMM'` → nome do mês em PT-BR.
   - Convenção: usar capitalizado completo (`Janeiro`, `Fevereiro`, …, `Dezembro`).
   - Quando o período abrange mais de um ano civil, sufixar com `/AA` (ex.: `Dez/25`) para não confundir; quando só um ano, mostra apenas o nome do mês.
   - Fallback: se entrada inválida, devolve a string original.

2. Aplicar o formatter ao montar `label` nas duas linhas (327 e 633) do `ComercialPage.tsx`.

3. NÃO alterar:
   - Backend / API / contrato.
   - Tabela mensal (colunas `Ano/Mês` continuam `YYYYMM`).
   - Drill (`handleClickMensal` continua usando `anomes` via `normalizeAnomes`; o campo `label` não é usado como filtro técnico).
   - Outros widgets/gráficos.

## Arquivos afetados

- `src/pages/bi/ComercialPage.tsx` — adicionar helper e aplicar nos dois `label`.

## Critério de aceite

- Eixo X do "Faturamento mensal x Meta" mostra `Janeiro, Fevereiro, Março, Abril, Maio, Junho` em vez de `202601…202606`.
- Tooltip do gráfico mostra o mesmo label legível.
- Clique no mês continua abrindo o drill correto (drilldown mensal não quebra).
- Tabela mensal e demais widgets inalterados.
- Sem erros de console.
