# Performance da Impressão de OP — Thumbnails de desenhos

## Objetivo
Reduzir o tempo de renderização da tela `/producao/impressao-op` ao visualizar várias OPs com desenhos, usando **miniatura leve no preview** e **arquivo A4 completo apenas na impressão**.

## Mudanças no Frontend

### 1) `src/lib/producao/opImpressao.ts`
Adicionar o campo opcional `url_thumbnail` em `OpDesenho` para o front já estar preparado quando a API começar a retornar:

```ts
export interface OpDesenho {
  // ...campos atuais
  url_thumbnail?: string;
}
```

### 2) `src/components/producao/OpPrintSheet.tsx`
- Criar um novo componente `DrawingPreviewThumbnail` que:
  - Recebe um `OpDesenho` e usa, por ordem de preferência: `desenho.url_thumbnail` → `desenho.url_impressao` → `desenho.url`.
  - Renderiza `<img loading="lazy" decoding="async" />` com classe `drawing-thumbnail` (ou `<iframe>` simples para PDF) limitada visualmente a ~600px de largura.
  - Usa `useAuthedBlobUrl` para baixar a URL com header de autenticação, igual ao restante do módulo (a API exige Bearer + `ngrok-skip-browser-warning`).
  - Em caso de erro/PDF sem thumbnail, mostra um placeholder textual leve, **sem** baixar o A4 completo.
- No fluxo `preview === true`:
  - Substituir todos os pontos onde hoje chamamos `renderDesenhos(...)`/`renderDesenhosOuReserva(...)` por uma nova função `renderDesenhosPreview(keyPrefix)` que devolve uma sequência de `DrawingPreviewThumbnail` (uma por desenho, ou um aviso "sem desenho").
  - Isso vale tanto para o modo `quebrarPorOperacao` (uma miniatura logo após cada operação) quanto para o modo padrão.
  - **Não** disparar carregamento dos manifests A4 nem das páginas A4 enquanto estiver em preview.
- No fluxo de impressão (`preview === false`):
  - Manter exatamente a lógica atual: `renderDesenhos` / `renderDesenhosOuReserva` continuam usando `paginasDesenhosA4` + `DrawingPage` para o A4 completo.
- Ajustar `renderPreviewDesenhosResumo` para apenas mostrar a contagem/aviso textual (a galeria de miniaturas passa a ser intercalada por operação).

### 3) `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Só carregar `paginasDesenhosA4` (hook `useDesenhosA4` / `prepararDesenhosParaImpressao`) **quando o usuário acionar imprimir/gerar PDF**, não no preview da grade.
  - Hoje esse preparo dispara fetch de todos os manifests + todas as páginas A4 mesmo antes de imprimir, que é a causa principal da lentidão.
  - Manter o `aguardarDesenhosProntos()` antes do `window.print()`, garantindo que as páginas A4 estejam carregadas naquele instante.
- O preview da página passa a usar somente miniaturas via `DrawingPreviewThumbnail`.

### 4) `src/components/producao/op-print.css`
- Adicionar regras para `.drawing-thumbnail`:
  - `max-width: 600px; width: 100%; height: auto; object-fit: contain;`
  - Sombra/borda leve para destacar no preview.
  - `@media print { .drawing-thumbnail { display: none; } }` para garantir que a miniatura nunca apareça na folha impressa.
- Garantir que `.op-drawing-image` / `DrawingPage` continuem com `display: none` no preview e visíveis na impressão (ajustar se necessário para não conflitar).

## Compatibilidade com a API atual
- A API ainda não retorna `url_thumbnail`. O componente `DrawingPreviewThumbnail` já cai automaticamente em `url_impressao` ou `url`, então:
  - **Hoje:** o preview continua funcionando, usando a URL existente (mas só uma imagem por desenho, com `loading="lazy"`, sem pré-carregar A4 paginado — já é bem mais leve).
  - **Quando o backend implementar** o campo `url_thumbnail` (documentado abaixo), a melhoria fica completa, sem precisar de nova mudança no front.

## O que precisa do backend (fora deste PR)
Documentar em `docs/backend-impressao-ordem-producao.md` o contrato esperado:

```json
{
  "id": "desenho_123",
  "nome_arquivo": "arquivo.jpg",
  "url": "/api/producao/desenhos/123/arquivo",
  "url_impressao": "/api/producao/desenhos/123/a4",
  "url_thumbnail": "/api/producao/desenhos/123/thumbnail"
}
```

- `GET /api/producao/desenhos/{id}/thumbnail` → WEBP/JPG, largura máx. ~600px, qualidade ~70%, cache habilitado.
- Para PDF, gerar thumbnail apenas da 1ª página.
- Autenticação igual aos demais endpoints (Bearer + `ngrok-skip-browser-warning`).

## Fora de escopo
- Implementação do endpoint de thumbnail (backend FastAPI).
- Alterações no layout de impressão A4 propriamente dito.
- Outros modos de exibição (lote, compartilhamento público, etc.) seguem com o mesmo comportamento — só o caminho preview vs print muda.

## Resultado esperado
- Preview da tela de Impressão de OP abre rápido mesmo com várias OPs e várias sequências por OP.
- Miniaturas leves intercaladas por sequência, com `loading="lazy"`.
- Impressão continua imprimindo o desenho completo em A4 com a margem correta e o ciclo `operação → desenho` por sequência já implementado.
