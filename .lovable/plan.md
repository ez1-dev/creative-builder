# Corrigir sobreposição no PDF de Relatório de RH

## Problema

Nos cards de KPI do PDF (`Rotatividade / Turnover`, `Resumo da Folha`, etc.) os dígitos aparecem sobrepostos na linha de variação (ex.: `1̸9̸,86% (-18,3%) vs anterior`).

Causa: o componente `Kpi` em `src/components/rh/pdf/ModuloPdf.tsx` usa os glifos Unicode `▲`, `▼`, `▬` para indicar tendência. A fonte padrão do `@react-pdf/renderer` (`Helvetica`) não possui esses caracteres — o renderizador insere fallbacks de largura zero/incorreta, que colidem visualmente com o texto seguinte. O mesmo ocorre em qualquer trecho que dependa desses símbolos.

## Alterações

Escopo restrito à camada de apresentação do PDF — não altera cálculos, contratos ou dados.

### 1. `src/components/rh/pdf/ModuloPdf.tsx`

- Trocar os glifos Unicode na linha de delta do componente `Kpi` por marcadores ASCII seguros na Helvetica:
  - `▲` → `+`
  - `▼` → `-`
  - `▬` → `=`
- Simplificar o texto da variação para reduzir largura em cards estreitos:
  - Antes: `▲ 1.234 (-18,3%) vs anterior`
  - Depois: `+1.234  (-18,3%)  vs anterior`
- Nenhuma outra lógica alterada (cálculo de `up`/`down`, cores `deltaUp`/`deltaDown`/`deltaFlat` permanecem).

### 2. `src/components/rh/pdf/pdfStyles.ts`

- Ajustar `kpiCard` para tolerar melhor a linha de delta:
  - `padding: 8` → `padding: 10`
  - Adicionar `minHeight: 62` para uniformizar cards com e sem delta.
- Ajustar `kpiDelta`:
  - `fontSize: 8` → `fontSize: 8.5`
  - Adicionar `lineHeight: 1.3` para evitar colisão vertical entre valor e delta em cards com valor grande.
- Ajustar `kpiValue`:
  - `marginTop: 2` → `marginTop: 3`.

Nenhuma mudança em grid, largura de cards ou paleta.

## Fora de escopo

- Não altera as telas web de RH.
- Não altera `pdfRelatorio.ts`, `relatorio.ts`, `api.ts` ou qualquer cálculo.
- Não muda o formato do PDF, layout de páginas, capa, tabelas ou seção de IA.

## Validação

Após o build, gerar novamente o PDF em `/rh/turnover` e conferir:
- Linha de variação legível sem sobreposição.
- Cards de Turnover (`Taxa`, `Admitidos`, `Demitidos`, `Saldo`, `Headcount Médio`, `Headcount Fim`) alinhados.
- Demais módulos (Resumo Folha, Absenteísmo, Férias, Contratos, Quadro) mantêm layout.
