

# Tornar KPIs responsivos em todas as páginas

## Problema
Os KPIs usam `grid-cols-2 md:grid-cols-4 lg:grid-cols-6` em telas grandes, mas em telas pequenas (mobile) os cards ficam apertados com 2 colunas, e o texto dos valores pode truncar. O componente `KPICard` também tem tamanho de fonte fixo que não se adapta bem.

## Mudanças

### 1. `src/components/erp/KPICard.tsx`
- Tornar o texto do valor responsivo: `text-lg sm:text-xl` em vez de `text-xl` fixo
- Reduzir padding em mobile: `p-3 sm:p-4`
- Ícone menor em mobile: `h-4 w-4 sm:h-5 sm:w-5`
- Garantir que textos longos (valores monetários) usem `truncate` para não quebrar layout

### 2. `src/pages/PainelComprasPage.tsx`
- Ajustar o grid das 3 seções de KPIs para melhor responsividade:
  - `grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6`
  - Isso garante 1 coluna em mobile estreito, 2 em mobile normal, 3 em tablet, 4 em laptop, 6 em desktop

### 3. Outras páginas com KPIs (OndeUsaPage, EstoquePage, etc.)
- Aplicar o mesmo padrão de grid responsivo para consistência

## Arquivos afetados
- `src/components/erp/KPICard.tsx` — tipografia e padding responsivos
- `src/pages/PainelComprasPage.tsx` — grid breakpoints
- Demais páginas com KPIs — mesma correção de grid

