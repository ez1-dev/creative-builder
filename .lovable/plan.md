## Objetivo

Adaptar o front da tela "Impressão de Ordem de Produção" para consumir os novos campos da API (`url_manifest_a4`, `usar_paginas_a4_normalizadas`, `layout_impressao = A4_RETRATO_NORMALIZADO`), expandindo cada desenho em uma ou mais páginas A4 já normalizadas e renderizando cada uma como `<img>` ocupando a folha inteira. Não mexer no layout da OP, operações nem componentes — só na renderização/carregamento dos desenhos.

## Escopo

Apenas:
- `src/lib/producao/opImpressao.ts` — tipos.
- `src/components/producao/OpPrintSheet.tsx` — renderização dos desenhos.
- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` — pré-fetch das páginas A4 para preview/impressão.
- `src/components/producao/op-print.css` — ajuste do `.op-drawing-page` para preencher a folha.

Não tocar em: cabeçalho, operações, componentes, apontamento, lógica de `quebrar_por_operacao`, API.

## Mudanças

### 1. Tipos (`src/lib/producao/opImpressao.ts`)

Adicionar `OpDesenhoPaginaA4` e novos campos em `OpDesenho`:

```ts
export interface OpDesenhoPaginaA4 {
  pagina: number;
  url: string;
  mime_type?: string;
  nome_arquivo?: string;
}

export interface OpDesenho {
  // ...campos existentes
  url_manifest_a4?: string;
  cache_key?: string;
  usar_paginas_a4_normalizadas?: boolean;
  // layout_impressao já existe — incluir 'A4_RETRATO_NORMALIZADO' na união
}
```

### 2. Loader de manifest A4 (novo módulo `src/lib/producao/opDesenhosA4.ts`)

Funções utilitárias:

- `fetchComToken(url)` — wrap em torno do mesmo padrão de `useAuthedBlobUrl` (Bearer + `ngrok-skip-browser-warning`, prefixa `getApiUrl()` se relativo).
- `carregarManifestDesenhoA4(desenho)` — se `url_manifest_a4` existir, GET no manifest e devolve `OpDesenhoPaginaA4[]`. Caso contrário, devolve um array com 1 página apontando para `url_impressao || url` (fallback legado).
- `carregarPaginaDesenhoA4(pagina, desenho)` — fetch da página, cria `blobUrl`, cacheia por chave (`cache_key|nome_arquivo : pagina : url`). Cache module-level (`Map<string, {blobUrl, mime_type}>`).
- `prepararDesenhosParaImpressao(desenhos)` — para cada desenho, expande para todas as páginas A4 já com `blobUrl`, na ordem; retorna `Array<OpDesenhoPaginaA4 & { blobUrl: string; desenho: OpDesenho }>` + um mapa de erros por desenho.

Sem concorrência limitada nessa primeira versão (serial), conforme orientação.

### 3. Hook `useDesenhosA4` (em `src/hooks/useDesenhosA4.ts`)

Recebe `desenhos: OpDesenho[]` e retorna `{ paginas, loading, errors }` usando `prepararDesenhosParaImpressao`. Cancela em unmount e revoga blobs criados naquele ciclo (mas mantém os cacheados em `desenhoBlobCache` enquanto o módulo vive).

### 4. `ImpressaoOrdemProducaoPage.tsx`

- Substituir o atual `useAuthedBlobUrls(desenhoUrls)` (que só baixava `url_impressao`) por `useDesenhosA4(data?.desenhos ?? [])`.
- Passar o resultado para `OpPrintSheet` via nova prop `paginasDesenhosA4` (sem quebrar a compatibilidade — manter `blobStates` apenas para a tabela de diagnóstico, ou removê-la e usar `errors` do novo hook).

### 5. `OpPrintSheet.tsx`

- Nova prop `paginasDesenhosA4?: Array<{ pagina; url; mime_type?; nome_arquivo?; blobUrl: string; desenho: OpDesenho }>`.
- Substituir `renderDesenhos()` por `renderDesenhosA4()` que itera sobre `paginasDesenhosA4` e gera um `<div class="op-drawing-page">` por página, com `<img class="op-drawing-image" src={blobUrl} />`.
- Remover render via `<object>`/`<iframe>` para PDF (PDF agora vem já rasterizado pela API).
- Manter fallback: se `paginasDesenhosA4` não vier (modo legado), continuar usando o atual `DrawingPage` via `useAuthedBlobUrl`.
- Manter a tabela de resumo `renderPreviewDesenhosResumo()` mostrando arquivos + número de páginas A4 geradas e status por desenho.

### 6. CSS `op-print.css`

Atualizar `.op-drawing-page` para `height: 283mm` fixo, adicionar `.op-drawing-image { width:100%; height:100%; object-fit:contain; display:block; }` em tela e em `@media print`. Remover `transform` / classes `.rotated` / `.rotate-90` desse fluxo (a API entrega já no retrato).

## Detalhes técnicos

- O cache `desenhoBlobCache` vive no módulo `opDesenhosA4.ts` para evitar re-download ao alternar preview ↔ print ↔ reabrir o mesmo desenho.
- Chave do cache: `${desenho.cache_key ?? desenho.nome_arquivo}::${pagina.pagina}::${pagina.url}`.
- `fetchComToken` usa `api.getToken()` (mesma fonte de `useAuthedBlobUrl`) em vez de ler `localStorage` direto, mantendo consistência com o resto da app.
- `cache: 'no-store'` no fetch das páginas e do manifest.
- Sem mudanças em `@page A4 portrait` (já configurado).
- Sem mudança no comportamento dos modos `quebrar_por_operacao = true/false` — apenas a função que renderiza desenhos é trocada.

## Validação

1. OP com 1 desenho de 1 página → 1 folha A4 preenchida.
2. OP com 1 PDF de 2 páginas (via manifest) → 2 folhas A4 sequenciais preenchidas.
3. OP sem `url_manifest_a4` (API antiga) → fallback para `url_impressao`/`url` em 1 folha.
4. Preview mostra status OK/Falha por desenho.
5. Impressão real (Ctrl+P) gera as folhas na ordem: header da OP → operações → componentes (se aplicável) → desenhos (1 página A4 por folha).
