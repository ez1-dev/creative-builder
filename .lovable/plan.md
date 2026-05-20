# Impressão de desenhos da OP — ajustes

Objetivo: garantir que ao marcar "Incluir desenhos", os desenhos sejam impressos **depois** da folha da OP (uma página por desenho, começando na página 2), com suporte a JPG/JPEG/PNG/PDF, filtro de formatos, pasta padrão pré-preenchida e rotação automática.

## 1. Filtros / parâmetros

`src/lib/producao/opImpressao.ts`
- Adicionar `formatos_desenho?: string` em `ImpressaoOpFiltros` (string CSV, ex.: `"JPG,PNG,PDF"`).
- Expandir `OpDesenho` com os novos campos retornados pela API:
  `extensao`, `mime_type`, `largura`, `altura`, `paginas`, `orientacao` (`'RETRATO' | 'PAISAGEM'`), `rotacao_recomendada` (number), `a4_layout`, `imprimir_em_nova_pagina` (bool), `iniciar_apos_op` (bool).

`src/lib/producao/opImpressaoLote.ts`
- Adicionar `formatos_desenho?: string` em `ImpressaoOpLoteParams`.
- Quando `incluir_desenhos === 'S'`, anexar `formatos_desenho` à query (já há `pasta_desenhos`). Não fazer `encodeURIComponent` manual — `URLSearchParams` (usado em `api.get`) já codifica.

`src/hooks/useImpressaoOrdemProducao.ts`
- Quando `incluir_desenhos === 'S'`, enviar também `formatos_desenho` (default `"JPG,PNG,PDF"`).

## 2. Página `ImpressaoOrdemProducaoPage.tsx`

- Em `EMPTY`:
  - `pasta_desenhos: '\\\\EZORTEA-SRVSENI\\Senior\\Sapiens\\Pasta de Desenho\\02-JPG_OP\\'`
  - novo estado `formatosDesenho: { jpg: boolean; png: boolean; pdf: boolean }` (todos `true` por padrão); função util `formatosString()` retornando CSV (`"JPG,PNG,PDF"`).
- Em `limpar`: resetar também `formatosDesenho` para todos true.
- No grupo "Refinamento", após o input "Caminho da pasta de desenhos", adicionar três checkboxes lado a lado (JPG / PNG / PDF), desabilitados quando `incluir_desenhos !== 'S'`. Pelo menos um deve permanecer marcado (validar antes de consultar/imprimir; se nenhum marcado, mostrar `toast.error`).
- Em `consultar` (via `fetchData`), `imprimirTodas` e `imprimirSelecionadas`: propagar `formatos_desenho: formatosString()` sempre que `incluir_desenhos === 'S'`.
- Bloquear navegação a caminhos `file://` ou `\\` direto no preview (já é só texto; nada a fazer além de não tentar abrir).

## 3. Renderização — `OpPrintSheet.tsx`

Reescrever `renderDesenhos()` para o novo contrato:

- Cada desenho vira sua **própria página A4** (`<div class="op-drawing-page">`), separada da folha da OP. Na ordem retornada pela API (`ordem` ascendente como vier).
- Cabeçalho da página do desenho: nome do arquivo, tipo, orientação, rotação aplicada (compacto).
- Tipo de arquivo (usar `mime_type` ou `extensao`):
  - **Imagem (JPG/JPEG/PNG)**: usar o novo hook `useAuthedBlobUrl(url)` (ver §4) e renderizar `<img class="op-drawing-img" />`. Quando `rotacao_recomendada === 90` ou `orientacao === 'PAISAGEM'`, aplicar classe `rotate-90`.
  - **PDF**: usar mesmo hook para obter blob URL e renderizar `<iframe class="pdf-drawing-frame">` (fallback simples sem dependência nova; `react-pdf` fica como TODO mas não é instalado neste passo). Aplicar `rotate-90` quando necessário.
- Em modo `quebrarPorOperacao`, manter desenhos **após** todas as páginas de operação (já é o comportamento atual). Em modo padrão, manter desenhos depois do conteúdo da OP.
- No preview da tela (não na impressão), adicionar uma lista resumo "Desenhos encontrados" com nome/tipo/orientação/rotação. Quando `incluir_desenhos === 'S'` e `data.desenhos` vazio: mostrar texto "Nenhum desenho encontrado para este produto." dentro de um bloco `no-print` (não imprime).

## 4. Hook utilitário — fetch autenticado de blob

Novo `src/hooks/useAuthedBlobUrl.ts`:
- Recebe `url: string | undefined` e tipo (mime opcional).
- `useEffect`: faz `fetch(url, { headers: { Authorization: 'Bearer ' + api.getToken(), 'ngrok-skip-browser-warning': 'true' } })`, pega `blob()`, gera `URL.createObjectURL(blob)`; revoga no cleanup.
- Retorna `{ blobUrl, loading, error }`.
- Se a URL é absoluta externa sem auth, usa fetch direto; se relativa, prefixar com `getApiUrl()`.

Usado por um pequeno subcomponente `<DrawingPage drawing={d}/>` dentro de `OpPrintSheet`.

## 5. Lote — `OpPrintBatch.tsx`

Nenhuma mudança estrutural: `OpPrintSheet` já é renderizado por OP. Como agora cada desenho é uma página própria dentro do `OpPrintSheet`, a ordem ficará automaticamente:
```
OP1 / Desenhos OP1 / OP2 / Desenhos OP2 / ...
```

Remover o wrapper `<div class="op-print-page">` por OP em `OpPrintBatch` apenas se ele estiver forçando page-break extra incorreto — deixar igual; quebras vêm do CSS de `.op-drawing-page` e `.op-sheet`. (Sem alteração funcional além de verificar comportamento.)

## 6. CSS — `op-print.css`

Substituir/atualizar as regras de `.op-drawing-page` pelas regras do brief:
- `.op-drawing-page`: 210mm × 297mm, flex center, `page-break-after: always; break-after: page;`, `overflow: hidden; background: white;`.
- `.op-drawing-page:last-child, .op-print-page:last-child { page-break-after: auto; break-after: auto; }`
- `.op-drawing-content` (190mm × 270mm flex center) e `.op-drawing-content img` (max 190×270, `object-fit: contain`).
- `.op-drawing-content img.rotate-90 { transform: rotate(90deg); max-width: 270mm; max-height: 190mm; }`
- `.pdf-drawing-frame { width: 190mm; height: 270mm; border: none; }` + variante `.rotate-90`.
- Pequeno cabeçalho `.op-drawing-meta` (apenas no print) acima da imagem.

## Fora do escopo
- Backend (a API já deve devolver `desenhos[]` no novo formato).
- Instalar `react-pdf` / `pdfjs-dist` — usar iframe agora; pode ser próxima iteração.
- Mudanças em `quebrar_por_operacao`, componentes ou operações da OP.
