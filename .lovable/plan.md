## Objetivo
Adicionar a barra de rolagem horizontal flutuante (já existente em `src/components/dre-studio/FloatingHScrollbar.tsx`) na grid principal do DRE Studio — Visualização, que hoje renderiza tanto a matriz da **DRE** quanto do **Balanço** (screenshots enviados). Assim, ao rolar meses horizontalmente, o usuário passa a ter uma barra fixa no rodapé do painel espelhando o scroll da tabela.

## Onde aplicar
Arquivo único: `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`.

O container da grid é o `div` em torno da linha 2143:

```tsx
<div className="relative rounded-lg border bg-white overflow-auto isolate">
  ...tabela DRE ou Balanço...
</div>
```

Esse mesmo container é reutilizado nos dois modos (NIVEL3 / matriz padrão), então uma única alteração cobre DRE e Balanço.

## Mudanças
1. `import { useRef } from 'react'` (se ainda não estiver) e `import { FloatingHScrollbar } from '@/components/dre-studio/FloatingHScrollbar'`.
2. Criar `const matrizScrollRef = useRef<HTMLDivElement>(null)` dentro do componente da página.
3. Anexar `ref={matrizScrollRef}` ao `div` de linha 2143.
4. Logo após o fechamento desse `div`, renderizar `<FloatingHScrollbar targetRef={matrizScrollRef} />`.

O componente `FloatingHScrollbar` já:
- só aparece quando há overflow horizontal real,
- resolve o elemento rolável descendente (fallback caso o wrapper não seja o próprio scroller),
- é `sticky bottom-0` e espelha o scroll bidirecionalmente,
- se descarta sozinho quando a tabela deixa de rolar.

## Fora do escopo
- Não altero o `ConciliacaoDREBalancoPanel` nem o `DreDinamicaTable`, que hoje não têm o problema (não são as grids das telas dos prints — os prints são a matriz do DRE Studio).
- Sem mudanças de estilo, cores ou tokens.
