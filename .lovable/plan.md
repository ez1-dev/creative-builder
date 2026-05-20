# Corrigir rotação de desenhos na Impressão de OP

## Objetivo
Garantir que preview e impressão usem sempre `desenho.url_impressao || desenho.url`, sem rotação CSS quando a API já entrega a imagem rotacionada.

## Mudanças

### 1. `src/components/producao/OpPrintSheet.tsx`
- `getDrawingPrintUrl(d)`: passar a retornar `d.url_impressao || d.url || ''` **inclusive para PDFs** (hoje PDFs ignoram `url_impressao`). Conforme regra do usuário a preferência por `url_impressao` é obrigatória sempre que existir.
- Em `renderDrawingBody`:
  - Trocar `<iframe>` por `<object data={blobUrl} type="application/pdf">` para PDFs (com fallback textual).
  - Remover por completo a aplicação das classes `rotated` / `rotate-90` quando `usingPrintUrl` for verdadeiro. `usingPrintUrl` passa a ser `Boolean(drawing.url_impressao)` (vale também para PDF).
  - Manter `shouldRotate` apenas como fallback legado quando NÃO houver `url_impressao` (compatibilidade com desenhos antigos sem o campo).

### 2. `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Ajustar `desenhoUrls` para sempre usar `d.url_impressao || d.url` (sem o desvio que força `d.url` para PDFs), espelhando o helper acima.

### 3. `src/components/producao/op-print.css`
- Reforçar regra (sem mexer no resto): garantir que `.op-drawing-page img` use `max-width/max-height` com `object-fit: contain` e que não exista nenhuma transform residual quando a imagem vem de `url_impressao`. As classes `.rotated` / `.rotate-90` continuam existindo apenas para o fallback legado descrito acima.

## Observação sobre dimensões A4
A mensagem do usuário traz CSS com `210mm × 297mm` (página) e `190mm × 270mm` (imagem). O CSS atual está em `196mm × 283mm` por causa do ajuste anterior “escala 100% sem cortes” já aprovado e registrado. Por padrão **mantenho 196/283** para não regredir a impressão. Se você quiser voltar para 210/297 + 190/270 confirme e eu altero junto.

## Fora de escopo
- Endpoint backend `/api/producao/ordem-producao/desenho/impressao` (já existente).
- Fluxo “Visualizar selecionadas”, `OpPrintBatch`, lógica de fetch em lote.
- Qualquer mudança no `useAuthedBlobUrl` / `useAuthedBlobUrls` (já enviam `Authorization` + `ngrok-skip-browser-warning`, equivalentes ao `fetch` sugerido).
