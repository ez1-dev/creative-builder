## Layout A4 fixo de impressão da OP (independente do destino)

### Problema
Hoje a página de impressão usa `width: 210mm` + `padding: 8mm 10mm`, ultrapassando a área útil do A4. O navegador reduz a escala automaticamente, deformando bordas, tabelas e tornando o conteúdo "miúdo" ao imprimir para PDF ou impressora física.

### Estratégia
Margem da página é controlada **só** pelo `@page` (7mm). O conteúdo interno usa **largura útil de 196mm** sem padding lateral. Remover `position: absolute`, `transform`, `zoom` e o padding interno das páginas. Manter o restante do layout intacto.

### Mudanças em `src/components/producao/op-print.css`

**1. `@page`** — Alterar margem de `8mm` para `7mm`.

**2. Estilos base (fora de `@media print`)** — Atualizar `.op-print-page`, `.op-operation-page`, `.op-drawing-page` (e `.componentes-page` se já existir) para `width: 196mm`, `min-height: 283mm`, sem padding lateral. Ajustar `.op-drawing-page img/iframe` para `max-width: 196mm; max-height: 283mm`. Manter `.op-sheet` interno como wrapper de conteúdo sem padding extra.

**3. Bloco `@media print`** — Substituir por:
- `html, body`: `width: 210mm`, `min-height: 297mm`, sem margem/padding, `-webkit-print-color-adjust: exact`.
- `.print-root`: **remover `position: absolute`**, usar `position: static`, `width: 100%`, sem padding/margin/transform/zoom.
- Páginas (`.op-print-page`, `.op-operation-page`, `.componentes-page`, `.op-drawing-page`): `width: 196mm`, `min-height: 283mm`, **sem padding**, `margin: 0 auto`, sem transform.
- `.op-sheet`: `width: 100%`, `padding: 0`, fontes em `pt` (8.5pt base) para consistência entre destinos.
- Tabelas: `table-layout: fixed`, bordas `0.5pt solid #000`, `padding: 1.5pt 2pt`.
- `.op-drawing-page img`: `max-width: 196mm; max-height: 283mm; width: auto; height: auto; object-fit: contain`.
- Manter regras de quebra de página (`page-break-after: always`, `page-break-inside: avoid` para `.op-operation`, linhas de tabela).
- Manter `.no-print`, `header`, `nav`, `aside`, `.app-header`, `.sidebar`, `.filters`, `.print-actions` com `display: none`.

**4. Drawing frame** — Já está com `width: 190mm; height: 270mm`. Atualizar para `width: 196mm; height: 283mm` para casar com a nova área útil (e atualizar `.drawing-image` `max-width/max-height` correspondentes).

### Mudança em `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
Pequeno ajuste de UX no botão/área de ações de impressão: adicionar texto auxiliar abaixo (ou tooltip) com a orientação:

> "Para melhor resultado, use papel A4, escala 100% (padrão) e margens padrão/nenhuma."

Pode ser um `<p className="text-xs text-muted-foreground">` próximo aos botões "Imprimir" / "Imprimir visualização" (no-print).

### Não fazer
- Não criar endpoint de PDF na API (mencionado pelo usuário como "solução definitiva futura", fora do escopo agora).
- Não mexer em `OpPrintSheet.tsx` (estrutura JSX), `OpPrintBatch`, lógica de rotação de desenhos (já corrigida via `url_impressao`), fluxo de "Visualizar selecionadas", quebra por operação/componentes.
- Não usar `transform: scale()` nem `zoom` em lugar nenhum do print.

### Arquivos
- `src/components/producao/op-print.css`
- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` (apenas texto de orientação)
