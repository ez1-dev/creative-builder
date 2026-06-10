## Problema
Ao gerar o PDF (via `window.print()`), o cabeçalho do `#rel-doc` não mostra o título "Relatório Executivo de Faturamento" nem o subtítulo "Período … • Unidade: …". O HTML está correto (`<h1 class="rel-titulo">` + `<p class="rel-subtitulo">` em `RelatorioExecutivoFaturamentoPage.tsx`), mas o conteúdo some no PDF.

Causa provável: `.rel-titulo` e `.rel-subtitulo` usam `color: hsl(var(--primary))` e `hsl(var(--muted-foreground))`. O container pai recebe Tailwind `bg-white text-slate-900`, e em alguns navegadores/contextos de impressão as variáveis CSS do tema (definidas em `:root`/`.dark`) podem resolver para tons claros que somem sobre o fundo branco do PDF — ou o `border-bottom: 3px solid hsl(var(--primary))` do `.rel-header` cobre o texto se a cor primária resolver para algo muito claro. Além disso, falta margem superior segura no `@page`.

## Solução (apenas CSS de impressão)
Arquivo único: `src/pages/bi/relatorio.css`.

1. Dentro do bloco `@media print`, forçar cores explícitas seguras para o cabeçalho, independentes das variáveis do tema:
   ```css
   #rel-doc .rel-header { border-bottom-color: #1d4ed8 !important; }
   #rel-doc .rel-titulo {
     color: #1d4ed8 !important;       /* azul corporativo */
     font-size: 22px !important;
     font-weight: 700 !important;
     display: block !important;
   }
   #rel-doc .rel-subtitulo {
     color: #334155 !important;        /* slate-700 */
     font-size: 13px !important;
     display: block !important;
   }
   #rel-doc .rel-data { color: #475569 !important; }
   #rel-doc .rel-bloco-titulo {
     color: #1d4ed8 !important;
     border-left-color: #1d4ed8 !important;
   }
   ```

2. Garantir que o `.rel-header` não seja recortado adicionando `padding-top: 4mm` ao `#rel-doc` em modo print (hoje está `padding: 0`):
   ```css
   #rel-doc { padding: 4mm 6mm !important; }
   ```

3. Reforçar `visibility: visible !important` e `display: flex !important` no `.rel-header` para evitar que algum reset/utility do Tailwind o oculte.

## Fora de escopo
- Não alterar o HTML do cabeçalho nem o componente `RelatorioExecutivoFaturamentoPage.tsx`.
- Não alterar lógica do `exportarPdf` (continua usando `window.print()`).
- Não mexer nos demais blocos do relatório, nem no design system global.

## Critérios de aceite
- Ao imprimir/exportar PDF, a primeira página mostra: título "Relatório Executivo de Faturamento" em azul, subtítulo "Período 202601 – 202606 • Unidade: CONSOLIDADO" em cinza, e data à direita.
- Borda azul inferior do cabeçalho visível.
- Demais blocos não afetados.
- Sem warning de console novo.