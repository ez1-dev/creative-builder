# Corrigir impressão em PDF do Relatório Executivo de Faturamento

## Diagnóstico

`exportarPdf` chama `window.print()`. O conteúdo do relatório está em `#rel-doc`, mas o shell do app (`AppLayout`) envolve a tela em:

- `<SidebarProvider>` + `<AppSidebar>`
- `<header data-tv-hide>` e `<footer data-tv-hide>`
- `<main className="flex-1 overflow-auto">`
- `<AiAssistantChat />`

O CSS atual em `src/pages/bi/relatorio.css` só esconde `nav, aside, header[role="banner"]` — esses seletores **não** batem com os elementos reais. Resultado: o navegador imprime a sidebar/headers e o `overflow-auto` do `<main>` corta o conteúdo, fazendo o relatório aparecer em branco ou parcial no PDF.

## Solução

Adotar o mesmo padrão já consolidado em `src/components/producao/op-print.css`: isolar o nó imprimível via `visibility`, garantindo que somente `#rel-doc` (e seus filhos) fiquem visíveis na impressão, e neutralizar containers com `overflow`/`position`.

### Mudanças

**`src/pages/bi/relatorio.css`** — substituir o bloco `@media print` por:

- `@page { size: A4 landscape; margin: 10mm }`
- `html, body { background:#fff !important; margin:0 !important; -webkit-print-color-adjust:exact; print-color-adjust:exact }`
- `body * { visibility: hidden !important }`
- `#rel-doc, #rel-doc * { visibility: visible !important }`
- `#rel-doc { position: absolute !important; left:0; top:0; width:100% !important; max-width:none !important; padding:0 !important; box-shadow:none !important; background:#fff !important }`
- Manter `.rel-bloco { page-break-inside: avoid }` e adicionar `page-break-inside: avoid` em `.rel-kpi`, `.rel-ranking` e linhas de `.rel-tabela-detalhe tr` para evitar cortes feios.
- Esconder explicitamente itens fora do escopo do relatório (caso visibility-hidden não baste por z-index/transform):
  `[data-sidebar], header[data-tv-hide], footer[data-tv-hide], [data-radix-popper-content-wrapper], .ai-assistant-chat { display:none !important }`

Nada muda no TSX — `exportarPdf = () => window.print()` continua suficiente, agora que o CSS isola corretamente o documento.

### Fora de escopo

- Geração de PDF client-side (jsPDF/html2canvas) — segue usando o diálogo nativo de impressão do navegador.
- Exportação PPTX, lógica dos blocos e dados.
- Outras telas que imprimem (Produção/OP já tem seu próprio CSS funcional).

## Como validar

1. `/bi/faturamento/relatorio-executivo` → gerar relatório → "Exportar PDF (Imprimir)".
2. Na pré-visualização: sidebar/header/footer/chat invisíveis, todas as seções (KPIs, evolução, rankings, margem, comentários IA, tabela analítica) renderizadas até o final.
3. Quebra de página ocorre entre blocos, sem cortar cards/tabelas no meio.
