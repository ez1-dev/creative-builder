
## Objetivo

Garantir que, na tela "Impressão de Ordem de Produção", ativar **Incluir desenhos** não desconfigure o layout da OP nem traga a chrome do app (header/sidebar) para a impressão. Desenhos devem ser sempre páginas A4 independentes, depois da OP e da página de componentes. A mensagem "Nenhum desenho encontrado…" só pode aparecer no preview, nunca no papel.

## Mudanças

### 1. `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Envolver TUDO que é imprimível em um único container `<div className="print-root">…</div>`:
  - O `OpPrintBatch` (quando há `lote`)
  - O `OpPrintSheet` (quando há `data`)
- Manter o restante da página (PageHeader, filtros, grid, dialog de diagnóstico, banners) fora desse `.print-root`. Esses elementos já têm `no-print`, mas o isolamento por `visibility: hidden` blindará casos onde algum componente externo (toasts, sheet) escape.

### 2. `src/components/producao/OpPrintSheet.tsx`
- Remover `renderPreviewDesenhosResumo()` de dentro das `<div className="op-sheet …">` (hoje aparece dentro do último op-sheet e dentro do modo `quebrarPorOperacao`). Ele continua sendo renderizado, mas como irmão das páginas, sempre com `no-print`, para nunca sair no papel.
- A ordem de renderização final por OP passa a ser sempre:
  ```text
  [op-sheet principal]
  [componentes-page]   (se quebrarComponentes)
  [op-drawing-page]…   (se houver desenhos)
  [resumo de desenhos no-print]   (só preview)
  ```
- Garantir que nenhum `DrawingPage` ou indicador de desenho seja inserido dentro de um `op-sheet`.

### 3. `src/components/producao/op-print.css`
- Reescrever bloco `@media print` com as regras de isolamento:
  - `body *` → `visibility: hidden`; `.print-root, .print-root *` → `visibility: visible` + posicionamento absoluto e largura 210mm.
  - Esconder `header, nav, aside, .app-header, .topbar, .sidebar, .filters, .print-actions, .preview-message, .drawing-empty-message, .no-print`.
  - `.op-print-page, .componentes-page, .op-drawing-page`: `width:210mm; min-height:297mm; height:auto; box-sizing:border-box; padding:8mm 10mm; margin:0; background:white; page-break-after:always; break-after:page; overflow:hidden`.
  - `:last-child` dessas classes → `page-break-after:auto`.
  - `.op-drawing-page` flex centralizado; `img` `max-width:190mm; max-height:270mm; object-fit:contain`; `iframe/object` `190mm × 270mm; border:none`.
  - `.componentes-page table, .op-main-content, .operation-block, .op-drawing-content` → `page-break-inside:avoid`.
- Ajustar a regra **fora** de `@media print` que hoje fixa `.op-drawing-page { height: 297mm }` para `min-height: 297mm; height: auto;` (evita corte do desenho no preview).
- Remover a duplicação atual de regras `.op-print-page` / `.componentes-page` no fim do arquivo (já existem no topo) para não conflitar.

### 4. Validação (não há mudança de código, só checagem)
- Verificar visualmente no preview que:
  - Sem desenhos: layout idêntico ao atual.
  - Com 1+ desenhos: cada desenho ocupa uma página A4, sempre depois da OP / página de componentes.
  - Mensagem "Nenhum desenho encontrado…" aparece só no preview e somente como bloco `no-print` fora da `op-sheet`.
- Verificar no diálogo de impressão do navegador que:
  - Não aparece header/sidebar do app.
  - As quebras de página são uma por seção lógica.

## Fora de escopo

- Nenhuma mudança no backend, no `useAuthedBlobUrls` ou no fluxo de fetch autenticado dos desenhos.
- Nenhuma mudança na lógica de "mais de 7 componentes → página separada" (já implementada).
