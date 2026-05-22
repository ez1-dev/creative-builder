## Objetivo

Quando a página de componentes tiver **mais de 30 itens**, encolher tipografia e altura das linhas automaticamente para caber tudo numa **única folha A4**, sem quebra de página. Até 30 componentes mantém o tamanho atual.

## Estratégia

Marcar o elemento `.componentes-page` com uma classe modificadora baseada na quantidade (`.componentes-page--compact-31-50`, `--compact-51-70`, `--compact-71+`) e aplicar CSS denso só nesse caso. Mantém o comportamento atual intocado para listas ≤30.

## Mudanças

1. **`src/components/producao/OpPrintSheet.tsx`** — Em `renderComponentesPage()` (linha 163), calcular a classe densa pela quantidade total de componentes:

   ```ts
   const total = componentes.length;
   const densityClass =
     total <= 30 ? ''
     : total <= 50 ? 'componentes-page--compact-31-50'
     : total <= 70 ? 'componentes-page--compact-51-70'
     : 'componentes-page--compact-71';
   ```

   E aplicar no `<div className={`op-sheet componentes-page ${densityClass} ${preview ? 'op-sheet--preview' : ''}`}>`.

2. **`src/components/producao/op-print.css`** — Adicionar (fora do `@media print`, também valendo para preview, para o que se vê = o que se imprime):

   ```css
   .componentes-page--compact-31-50 table { font-size: 8.5px; }
   .componentes-page--compact-31-50 th,
   .componentes-page--compact-31-50 td { padding: 1px 3px; line-height: 1.1; }

   .componentes-page--compact-51-70 table { font-size: 7.5px; }
   .componentes-page--compact-51-70 th,
   .componentes-page--compact-51-70 td { padding: 0.5px 2px; line-height: 1.05; }
   .componentes-page--compact-51-70 .op-stage-bar,
   .componentes-page--compact-51-70 .op-section-title { font-size: 9px; padding: 1px 4px; }

   .componentes-page--compact-71 table { font-size: 6.5px; }
   .componentes-page--compact-71 th,
   .componentes-page--compact-71 td { padding: 0 2px; line-height: 1.0; }
   .componentes-page--compact-71 .op-stage-bar,
   .componentes-page--compact-71 .op-section-title { font-size: 8px; padding: 0 4px; }
   ```

   E no `@media print` da `.componentes-page` já reaberta, adicionar:

   ```css
   .componentes-page--compact-31-50,
   .componentes-page--compact-51-70,
   .componentes-page--compact-71 {
     page-break-inside: avoid !important;
     break-inside: avoid !important;
   }
   .componentes-page--compact-31-50 tbody,
   .componentes-page--compact-51-70 tbody,
   .componentes-page--compact-71 tbody {
     page-break-inside: avoid !important;
     break-inside: avoid !important;
   }
   ```

   Isso força o navegador a manter a tabela inteira em uma única folha (sem quebra), e o CSS denso garante que ela caiba.

## Critério dos limites

Cabeçalho da OP ocupa ~50mm da folha (header + título "Relação de componentes" + barra de estágio); sobram ~230mm para a tabela. Estimativa:

- 30 itens × ~7mm/linha = 210mm → cabe com tipografia atual.
- 31–50 itens: ~4,5mm/linha → font 8.5px / padding 1×3.
- 51–70 itens: ~3,3mm/linha → font 7.5px / padding 0.5×2.
- 71+ itens: ~2,5mm/linha → font 6.5px / padding 0×2 (limite prático ~90 itens; acima disso a legibilidade fica comprometida e seria melhor quebrar em 2 folhas — fora do escopo).

## Validação

- OP 1109 (~30 componentes): renderiza igual a hoje, sem mudança.
- OP com 40, 60 e 80 componentes: pré-visualizar e abrir Ctrl+P, conferir que a tabela ocupa exatamente 1 folha A4 sem quebra.

## Fora de escopo

- Sem auto-scaling JavaScript (medindo altura real). A escala é por faixa de quantidade — mais simples, previsível e idêntica em preview/print.
- Sem mudança em backend, ordem de blocos ou modo inline (≤7 componentes).
