## Objetivo
Manter as duas barras superiores da tela DRE/Balanço → Visualização **recolhidas por padrão**, deixando mais espaço para a grid:

1. **Filtros salvos** (`FilterPresetBar`)
2. **Contexto** (Ano · Filial · Centro de Custo · Visão · Modelo)

## Comportamento
- Ao abrir a página, os dois blocos aparecem como **cabeçalhos finos** (uma linha só) com:
  - Título ("Filtros salvos" / "Contexto")
  - Resumo à direita mostrando o estado atual (ex.: `2026 · Filial 1 · Todos · Realizado`, e no de presets o nome do preset ativo ou "Nenhum salvo")
  - Chevron ▸ para expandir
- Clique no cabeçalho expande/recolhe (animação simples, sem libs novas).
- Estado de expandido/recolhido é **persistido em `localStorage`** por página (chaves `dre-vis:filtros-salvos-open` e `dre-vis:contexto-open`), default `false` (recolhido).
- Nenhuma mudança em lógica de filtros, cálculo, drill ou dados — apenas apresentação.

## Arquivos
- `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`
  - Envolver o bloco `FilterPresetBar` (linhas ~1514-1520) em um wrapper colapsável.
  - Envolver o bloco `CONTEXTO` (linhas ~1876-…) em wrapper colapsável, aproveitando o header já existente (`Contexto` + badge DRE/nome do modelo) como área clicável e adicionando chevron + resumo dos filtros ativos quando recolhido.
- Sem novos componentes globais — collapsible inline usando `useState` + `localStorage` (padrão já usado em outras telas do projeto).

## Fora de escopo
- Não alterar `FilterPresetBar` em si (usado por outras páginas).
- Não mexer no stepper de onboarding, drill, grid, exportações.
