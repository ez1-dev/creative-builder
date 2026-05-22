# Performance da Impressão de OP — Thumbnails de desenhos (implementado)

Mudanças aplicadas:

- `src/lib/producao/opImpressao.ts`: adicionado campo opcional `url_thumbnail` e `id` em `OpDesenho`.
- `src/components/producao/OpPrintSheet.tsx`:
  - Novo componente `DrawingPreviewThumbnail` (no-print, `loading="lazy"`, fetch autenticado via `useAuthedBlobUrl`).
  - Novo helper `renderDesenhosThumbs` para listar miniaturas por OP/sequência.
  - `renderDesenhosOuReserva` agora **sempre** inclui miniaturas (visualização) e só inclui as páginas A4 quando `loadFullDrawings === true`.
  - Nova prop `loadFullDrawings?: boolean` (default `!preview`).
- `src/components/producao/OpPrintBatch.tsx`: encaminha `loadFullDrawings` para cada `OpPrintSheet`.
- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`:
  - `useDesenhosA4` só roda quando `loadFullDrawings === true`.
  - Novo `dispararImpressao()` que ativa o flag, espera o A4 carregar, aguarda imagens (`aguardarDesenhosProntos`) e chama `window.print()`.
  - Reseta `loadFullDrawings` ao trocar de OP/lote.
  - Todos os gatilhos (`imprimir`, `gerarPdf`, `handleRowImprimir`, `imprimirTodas`, `imprimirVisualizacao`) usam `dispararImpressao()`.
- `src/components/producao/op-print.css`: estilos `.drawing-thumbnail-*` (no-print).
- `docs/backend-impressao-ordem-producao.md`: documenta o contrato `url_thumbnail` e endpoint `/api/producao/desenhos/{id}/thumbnail`.

Resultado: o preview da tela `/producao/impressao-op` deixa de baixar manifests A4 + páginas A4 e usa apenas miniaturas leves; o A4 só é baixado quando o usuário aciona impressão/PDF.
