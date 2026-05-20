## Rotação automática de desenhos em paisagem na impressão da OP

### Objetivo
Quando a API marcar um desenho como paisagem (`rotacionar_para_retrato = true` ou `rotacao_recomendada = 90`), girá-lo 90° e ampliá-lo para preencher o máximo da página A4 retrato. Caso contrário, manter renderização normal. Cada desenho continua em página separada.

### Mudanças

**1. `src/lib/producao/opImpressao.ts`** — estender `OpDesenho` com os novos campos opcionais retornados pela API:
- `largura?: number`
- `altura?: number`
- `orientacao?: string`
- `rotacao_recomendada?: number`
- `rotacionar_para_retrato?: boolean`

**2. `src/components/producao/OpPrintSheet.tsx` → `renderDrawingBody`**
- Calcular `shouldRotate = drawing.rotacionar_para_retrato === true || Number(drawing.rotacao_recomendada) === 90`.
- Para JPG/JPEG/PNG (não-PDF), envolver o `<img>` em uma estrutura:
  ```
  <div class="op-drawing-page">
    <div class={`drawing-frame${shouldRotate ? ' rotated' : ''}`}>
      <img class={`drawing-image${shouldRotate ? ' rotate-90' : ''}`} ... />
    </div>
  </div>
  ```
- PDF continua usando `<iframe>` como hoje (sem rotação — não há como rotacionar conteúdo de iframe cross-origin).
- Remover o texto "Nenhum desenho encontrado" do estado vazio (só renderiza a página vazia ou nada).

**3. `src/components/producao/op-print.css`** — adicionar as classes `.drawing-frame`, `.drawing-frame.rotated`, `.drawing-image`, `.drawing-image.rotate-90` exatamente conforme spec do usuário (tela e `@media print`). Ajustar `.op-drawing-page` para usar `height: 297mm` fixo + `overflow: hidden` (já existe; alinhar com spec). A rotação fica isolada dentro de `.op-drawing-page` — não afeta a página da OP.

**4. Mensagem "Nenhum desenho encontrado"** — em `renderDesenhos` (linhas ~286–289 do `OpPrintSheet.tsx`), remover o bloco que renderiza essa mensagem na impressão. Continua aparecendo o bloco de status apenas no preview (fora de `op-drawing-page`).

**5. Aguardar imagens carregar antes de `window.print()`** — `aguardarDesenhosProntos` em `ImpressaoOrdemProducaoPage.tsx` já espera `img.complete`/`load` dentro de `.op-drawing-page`. Sem mudança.

### Fora de escopo
- Rotação de PDFs em iframe (limitação do browser).
- Mudanças no backend.
- `OpPrintBatch` — usa o mesmo `OpPrintSheet`, herda automaticamente.
