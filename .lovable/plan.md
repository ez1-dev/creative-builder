## Usar `url_impressao` da API e remover rotação CSS dos desenhos

### Objetivo
A API passou a devolver, em cada desenho, uma `url_impressao` que já entrega a imagem **rotacionada para retrato** quando o original é paisagem. O frontend deve consumir essa URL e parar de aplicar `rotate(90deg)` via CSS, que estava distorcendo a impressão.

### Mudanças

**1. `src/lib/producao/opImpressao.ts`** — Adicionar campo opcional `url_impressao?: string` em `OpDesenho`.

**2. `src/components/producao/OpPrintSheet.tsx`**
- Criar helper `getDrawingPrintUrl(d) = d.url_impressao || d.url`.
- Em `renderDesenhos`, passar `precomputed={blobStates?.[getDrawingPrintUrl(d)]}` (em vez de `d.url`).
- `DrawingPageStandalone` deve chamar `useAuthedBlobUrl(getDrawingPrintUrl(drawing))`.
- Em `renderDrawingBody`:
  - Calcular `usingPrintUrl = Boolean(drawing.url_impressao)`.
  - `shouldRotate = !usingPrintUrl && (drawing.rotacionar_para_retrato === true || Number(drawing.rotacao_recomendada) === 90)`.
  - Quando `usingPrintUrl`, renderizar `<img className="drawing-image" />` sem `rotate-90` e wrapper `drawing-frame` sem `rotated`. A imagem já vem em retrato.
- Em `renderPreviewDesenhosResumo`, trocar todos os `blobStates[d.url]` por `blobStates[getDrawingPrintUrl(d)]` para o status (OK/Falha/Carregando) refletir o download real.

**3. `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`** — Em `desenhoUrls` (linha 113), mapear `(d) => d.url_impressao || d.url` para que `useAuthedBlobUrls` pré-carregue a URL correta antes do `window.print()` e `aguardarDesenhosProntos` aguarde o blob certo.

**4. `src/components/producao/op-print.css`** — Simplificar a seção “Rotação automática de desenhos paisagem”:
- Manter `.drawing-frame` (sem variante `.rotated`) e `.drawing-image` com `max-width: 190mm; max-height: 270mm; width: auto; height: auto; object-fit: contain;`.
- Remover (ou deixar como fallback inerte) as regras `.drawing-frame.rotated` e `.drawing-image.rotate-90` que aplicavam `transform: rotate(90deg)`. A rotação agora vem da API; o CSS não precisa girar.
- Manter `.op-drawing-page` como já está (A4 retrato, centralizado, overflow hidden).

### Compatibilidade
- Se a API ainda não devolver `url_impressao` para algum desenho, o código cai para `drawing.url` e mantém o comportamento atual (sem rotação CSS — assumimos que a API já entrega rotacionado quando aplicável; manter `shouldRotate` apenas como fallback para `drawing.url`, conforme item 2).

### Não fazer
- Não alterar o endpoint da API nem o backend (escopo do prompt anterior, já implementado lá).
- Não mexer em `OpPrintBatch`, `aguardarDesenhosProntos`, fluxo de “Visualizar selecionadas” nem regras de quebra por operação/componentes.
- Não alterar `useAuthedBlobUrl(s)`.

### Arquivos
- `src/lib/producao/opImpressao.ts`
- `src/components/producao/OpPrintSheet.tsx`
- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- `src/components/producao/op-print.css`
