## Objetivo

Exibir a descrição das linhas em **uma única linha** nas telas de visualização da **DRE Studio** e do **Balanço Patrimonial**, truncando com `…` quando ultrapassar **40 caracteres**, e mostrar o texto completo em **tooltip** ao passar o mouse.

## Mudanças

### 1. Utilitário compartilhado
- Criar `src/lib/textTruncate.ts` com função `truncateLabel(text, max = 40)` que corta em 40 chars e adiciona `…`, preservando o texto original para tooltip.

### 2. DRE Studio — Visualização
- Em `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` (e/ou no componente de matriz/tabela que renderiza a coluna "Descrição"):
  - Envolver a célula de descrição com `whitespace-nowrap overflow-hidden text-ellipsis` + `max-w-[<n>ch]` (largura equivalente a ~40 caracteres).
  - Aplicar `title={descricaoOriginal}` (tooltip nativo) para revelar o texto completo.
  - Manter indentação por nível e negrito das totalizadoras.

### 3. Balanço Patrimonial
- Em `src/pages/contabilidade/BalancoPatrimonialPage.tsx`, ajustar a coluna `conta` (e `grupo`/`subgrupo` se longos) na `DataTableBI`:
  - Usar `render` custom que aplica `truncateLabel` + `title` com o valor original.
  - Classe `whitespace-nowrap` para forçar linha única.

### 4. Sem impacto em
- Export para Excel (mantém texto completo).
- Drill-down (mantém descrição completa nos modais).
- Lógica de cálculo, filtros ou API.

## Detalhes técnicos

- Truncamento sempre pelo comprimento de caracteres (40), sem quebra por palavra, para garantir padrão visual uniforme.
- Tooltip via atributo `title` nativo (leve, acessível, sem dependência extra).
- CSS: `truncate max-w-[40ch]` do Tailwind já cobre o caso; complementar com `title` para acessibilidade.