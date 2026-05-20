# Impressão de desenhos — simplificar UI e garantir carregamento antes de imprimir

A API agora controla o caminho dos desenhos e o filtro de formatos. O frontend só decide se inclui ou não.

## 1. UI — `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`

- Remover o campo `Input` "Caminho da pasta de desenhos" e o bloco de checkboxes "Formatos dos desenhos" (JPG/PNG/PDF) do grupo "Refinamento".
- Manter apenas o checkbox **Incluir desenhos**.
- Remover o estado `formatosDesenho`, o tipo `FormatosDesenho`, `DEFAULT_FORMATOS`, `buildFormatosString`, `DEFAULT_PASTA_DESENHOS` e a validação "Selecione pelo menos um formato".
- Em `EMPTY`: remover `pasta_desenhos` e `formatos_desenho`.
- Em `consultar`, `imprimirTodas`, `imprimirSelecionadas`: remover qualquer envio de `pasta_desenhos` / `formatos_desenho`. Continuar enviando `incluir_desenhos=S|N`.
- Em `limpar`: remover reset de `formatosDesenho`.

## 2. Tipos / hooks

- `src/lib/producao/opImpressao.ts`: remover `pasta_desenhos` e `formatos_desenho` de `ImpressaoOpFiltros`. Manter `OpDesenho` enxuto com `ordem, nome_arquivo, tipo, extensao, mime_type, url` (remover campos extras que adicionei: `pasta, largura, altura, paginas, orientacao, rotacao_recomendada, a4_layout, imprimir_em_nova_pagina, iniciar_apos_op`).
- `src/hooks/useImpressaoOrdemProducao.ts`: bloco `if (filters.incluir_desenhos === 'S')` passa a apenas setar `payload.incluir_desenhos = 'S'`.
- `src/lib/producao/opImpressaoLote.ts`: remover `pasta_desenhos` e `formatos_desenho` de `ImpressaoOpLoteParams` e da query.

## 3. Renderização — `src/components/producao/OpPrintSheet.tsx`

- Simplificar `DrawingPage`: remover lógica de rotação (`rotacao_recomendada`, `orientacao`, classe `rotate-90`) e meta-info de orientação. Manter cabeçalho compacto com nome do arquivo + extensão.
- Detecção de PDF continua via `mime_type`/`extensao`/`tipo`.
- Continuar usando `useAuthedBlobUrl` (já busca com Bearer token e gera `URL.createObjectURL`).
- Atualizar resumo de preview "Desenhos encontrados": colunas `# / Arquivo / Tipo` (remover Orientação e Rotação).
- Mensagem "Nenhum desenho encontrado para este produto." continua só no preview (`no-print`), apenas quando `incluir_desenhos === 'S'`.

## 4. Aguardar carregamento antes de imprimir

Hoje `window.print()` é disparado via `setTimeout(..., 200|300)` em `imprimir`, `gerarPdf`, `handleRowImprimir`, `imprimirTodas`, `imprimirSelecionadas`. Quando há desenhos, isso é insuficiente.

Solução: helper local `aguardarDesenhosProntos()` na página, que após o React renderizar (`requestAnimationFrame` duplo) espera todas as `<img>` dentro de `.op-drawing-page` resolverem (`complete && naturalWidth>0` ou evento `load/error`) e todos os `<iframe>` dispararem `load`. Timeout máximo de ~10s para não travar.

Trocar os `setTimeout` de impressão por:
```ts
await aguardarDesenhosProntos();
window.print();
```

Quando `incluir_desenhos !== 'S'`, pular a espera (apenas `await new Promise(r => requestAnimationFrame(() => r(null)))` para garantir flush).

## 5. CSS — `src/components/producao/op-print.css`

Ajustar `.op-drawing-page` ao que foi pedido:
- `display: flex; align-items: center; justify-content: center;` (centralizado, sem cabeçalho ocupando coluna)
- Manter dimensões 210mm × 297mm, `page-break-after: always`, `:last-child auto`.
- `img { max-width: 190mm; max-height: 270mm; object-fit: contain; }`
- `iframe, object { width: 190mm; height: 270mm; border: none; }`
- Remover regras `.rotate-90`, `.op-drawing-content`, `.pdf-drawing-frame` (não mais usadas).
- Manter `.op-drawing-meta` discreto no topo (posicionar absolutamente ou simplesmente acima da mídia) — opcional; aceitável manter como pequena legenda no topo do flex. Mais simples: mudar layout para `flex-direction: column` com `justify-content: flex-start` e a mídia em `flex: 1` centralizada.

## Fora de escopo
- Backend.
- Mudanças em `quebrar_por_operacao`, componentes ou operações.
- Instalar `react-pdf` (fica como follow-up; iframe atende).
