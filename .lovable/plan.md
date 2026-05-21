## Objetivo

Garantir que a impressão de desenhos de OP use **somente** a saída já normalizada em A4 retrato entregue pela API (`/desenho/impressao-a4`), removendo qualquer tentativa do navegador de rotacionar/escalar conteúdo (JPG, PNG ou PDF — inclusive PDFs multipágina frente/verso).

O trabalho pesado é no FastAPI (fora do Lovable). No frontend, fechamos as pontas para nunca mais cair em fallback de rotação CSS quando o backend estiver implementado.

## Escopo dividido

### A) Documentação do contrato backend (este projeto)

Arquivo: `docs/backend-impressao-ordem-producao.md`

Atualizar / acrescentar:

1. **Nova rota oficial** (substitui o uso direto de `/desenho/impressao` para impressão):
   ```
   GET /api/producao/ordem-producao/desenho/impressao-a4?arquivo=<nome>
   ```
   Sempre devolve o arquivo encaixado em **A4 retrato**, centralizado, com margem segura.

2. **JPG / PNG** — passos obrigatórios:
   - Abrir com Pillow, aplicar `ImageOps.exif_transpose`.
   - Se `largura > altura`, rotacionar 90°.
   - Criar folha A4 300 DPI (`2480 x 3508 px`), margem `90 px`.
   - Redimensionar proporcional (`min(area_w/w, area_h/h)`).
   - Centralizar e devolver `image/jpeg` (quality 95).

3. **PDF** — passos obrigatórios (página a página, frente/verso):
   - Para cada página de origem detectar paisagem (`src_w > src_h`).
   - Criar página A4 retrato em branco (`595.2756 x 841.8898 pt`, margem `18 pt`).
   - Se paisagem: `Transformation().rotate(90).translate(tx=src_h, ty=0).scale(escala).translate(offset_x, offset_y)`.
   - Se retrato: apenas `scale + translate` para centralizar.
   - `merge_page` na página A4 nova.
   - Devolver `application/pdf` final (mesma quantidade de páginas da origem).

4. **Headers de resposta** (debug/print):
   - `Cache-Control: no-store`
   - `X-Original-File: <nome>`
   - `X-A4-Normalized: S`
   - `X-A4-Orientation: PORTRAIT`

5. **Erros**:
   - 422 para extensão fora de `jpg/jpeg/png/pdf`.
   - 500 se Pillow ou pypdf não estiverem instalados.
   - 404 se o arquivo não existir na pasta configurada (`PASTA_DESENHOS_OP_PADRAO` ou env override).

6. **Bloco `desenhos[]`** no payload de `/impressao` passa a obrigatoriamente trazer:
   ```json
   {
     "url": "/api/producao/ordem-producao/desenho?arquivo=...",
     "url_impressao": "/api/producao/ordem-producao/desenho/impressao-a4?arquivo=...&v=<mtime>",
     "layout_impressao": "A4_RETRATO",
     "rotacao_automatica": true
   }
   ```
   O `?v=<mtime>` evita cache do navegador.

7. **Plano de implementação em duas etapas** (registrar na doc):
   - Etapa 1: rota nova só para JPG/PNG + troca do `url_impressao` no payload.
   - Etapa 2: normalização PDF página a página.

8. Reforçar a regra: **o frontend nunca aplica rotação/escala**, apenas imprime `url_impressao`.

### B) Frontend Lovable

Arquivos:
- `src/components/producao/OpPrintSheet.tsx`
- `src/components/producao/op-print.css`
- `src/lib/producao/opImpressao.ts` (apenas se faltar tipagem; já está OK)

Ajustes:

1. **Remover por completo o fallback de rotação quando há `url_impressao`.**
   Em `renderDrawingBody`, hoje ainda existe `flagRotate` ligado a `rotacionar_para_retrato` / `rotacao_recomendada` mesmo no caminho novo. Trocar para:
   ```ts
   const flagRotate = !drawing.url_impressao && (
     drawing.rotacionar_para_retrato === true ||
     Number(drawing.rotacao_recomendada) === 90
   );
   ```
   Ou seja: rotação CSS só sobrevive como fallback legado quando o backend ainda não entrega `url_impressao`.

2. **Renderização de PDF** deve sempre ocupar a folha A4 inteira (não há mais necessidade de tratar paisagem):
   ```tsx
   <object data={blobUrl} type="application/pdf" className="op-drawing-pdf" />
   ```
   No CSS, garantir `width:100%; height:100%; border:0;` e `@page { size: A4 portrait; margin: 0 }` no contexto de impressão.

3. **CSS** — reforçar `.op-drawing-page`:
   ```css
   .op-drawing-page {
     width: 210mm;
     height: 297mm;
     page-break-after: always;
     break-after: page;
     display: flex;
     align-items: center;
     justify-content: center;
     overflow: hidden;
     background: #fff;
   }
   .op-drawing-page img { max-width: 100%; max-height: 100%; object-fit: contain; }
   .op-drawing-page object,
   .op-drawing-page iframe { width: 100%; height: 100%; border: 0; }
   ```
   Remover/neutralizar resquícios de `.drawing-frame.rotated` e `.drawing-image.rotate-90` no caminho novo (manter só comentado como fallback legado).

4. **Lote (`OpPrintBatch.tsx`)** — verificar se também consome `getDrawingPrintUrl` (que já usa `url_impressao || url`); se não, alinhar.

5. **Não alterar** `useImpressaoOrdemProducao` nem `opImpressao.ts` (tipos já têm `url_impressao`, `layout_impressao`, `rotacao_automatica`).

### Fora de escopo

- Implementação real do FastAPI (rota, Pillow, pypdf) — fica para o time de backend seguindo a doc.
- Mudanças no cabeçalho/apontamento/componentes da OP (já entregues no pacote anterior).
- Pré-visualização de PDF dentro da tela (mantém comportamento atual de impressão).

## Critérios de aceite

- Doc `backend-impressao-ordem-producao.md` descreve a rota `/desenho/impressao-a4` com todos os passos para JPG/PNG **e** PDF multipágina, headers, erros e plano em 2 etapas.
- Quando o backend devolver `url_impressao`, o Lovable imprime sem nenhuma classe `rotated` / `rotate-90` aplicada (validável inspecionando o DOM de impressão).
- PDF de 2 páginas (frente/verso) entregue pela API gera 2 páginas A4 retrato no print, sem corte.
- Fallback antigo (sem `url_impressao`) continua funcionando para não quebrar produção até o backend subir a rota nova.
