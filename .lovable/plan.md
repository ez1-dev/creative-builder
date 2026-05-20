## Objetivo

Garantir que **todo desenho (imagem) seja impresso em retrato**. Hoje a rotação depende de a API enviar `url_impressao` já em retrato ou das flags `rotacionar_para_retrato` / `rotacao_recomendada`. Quando o arquivo vier em landscape sem essas flags, ele aparece "deitado". Vamos detectar landscape pelo próprio `<img>` (após carregar) e rotacionar 90° automaticamente.

PDFs continuam como estão — não dá para detectar/rotacionar com segurança via `<object>`, e o backend já trata isso por `url_impressao`.

## Arquivo

- `src/components/producao/OpPrintSheet.tsx` — função `renderDrawingBody` e wrappers `DrawingPageStandalone` / `DrawingPageFromState`.

## Mudanças

### `renderDrawingBody`
- Adicionar `useState<boolean>` para `isLandscape` e `onLoad={(e) => setIsLandscape(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight)}` na `<img>`.
- Calcular `shouldRotate` como:
  ```
  shouldRotate = !pdf && (isLandscape || flagsAtuais)
  ```
  Mantendo as flags antigas (`rotacionar_para_retrato`, `rotacao_recomendada === 90`) como fallback para o caso do `onLoad` ainda não ter disparado.
- Como `renderDrawingBody` é função pura, transformar a parte da `<img>` em pequeno componente `DrawingImage` interno que tem o `useState`. Assim mantemos o resto da lógica (loading / error / PDF) intacto.

### Estilos
- As classes `.rotated` e `.rotate-90` já existem em `op-print.css` e funcionam — não precisa criar regra nova.

## Fora de escopo

- Sem alterações no backend / API / `url_impressao`.
- Sem mudanças no `@page` (já é `A4 portrait`).
- Sem alterações no fluxo de PDFs nem nos tamanhos da página de desenho.
