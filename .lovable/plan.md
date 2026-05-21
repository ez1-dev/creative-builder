## Objetivo

Tornar o carregamento dos desenhos A4 tolerante a falhas: se o `url_manifest_a4` der HTTP 500/404/qualquer erro, cair em fallback (`url_impressao || url`); se uma página falhar, pular só ela; mostrar aviso discreto fora da folha impressa.

## Escopo

- `src/lib/producao/opDesenhosA4.ts` — fallback no manifest e tolerância por página.
- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` — banner discreto (não imprimível) quando houver erros.

Não tocar em CSS, layout da OP, operações, componentes nem API.

## Mudanças

### 1. `opDesenhosA4.ts` — `carregarManifestDesenhoA4`

Envolver o fetch em try/catch. Em qualquer falha (response não-OK ou exceção):

- `console.warn('[OP A4] Falha ao carregar manifest de', desenho.nome_arquivo, status/err, '— usando fallback')`
- Retornar fallback de 1 página:
  ```ts
  [{ pagina: 1, url: desenho.url_impressao || desenho.url || '', mime_type: desenho.mime_type, nome_arquivo: desenho.nome_arquivo }]
  ```
- Se nem `url_impressao` nem `url` existirem, lançar erro (será capturado em `prepararDesenhosParaImpressao` e vira `OpDesenhoErro`).

### 2. `opDesenhosA4.ts` — `prepararDesenhosParaImpressao`

Já é tolerante por página (try/catch interno). Trocar o `console`/mensagem para `console.error('[OP A4] Falha ao carregar página', pagina.pagina, 'do desenho', desenho.nome_arquivo, e)` e garantir que segue para a próxima página/desenho sem interromper.

Também registrar `console.error` no catch externo (falha de manifest+fallback) com o nome do desenho.

### 3. `ImpressaoOrdemProducaoPage.tsx`

- Já recebe `errors` de `useDesenhosA4`. Renderizar, fora da área `.op-print-sheet` e com `className="print:hidden"`, um aviso discreto quando `errors.length > 0`:
  ```
  Alguns desenhos não puderam ser normalizados. Foi usado fallback quando possível.
  ```
- Estilo: texto pequeno, `text-muted-foreground`, ícone opcional `AlertTriangle`. Nada dentro de `OpPrintSheet`.

## Validação

1. Forçar `url_manifest_a4` retornando 500 → console.warn, desenho aparece via `url_impressao`, banner discreto visível na tela, ausente no print preview.
2. Página individual com 404 → console.error, demais páginas/desenhos seguem normalmente.
3. Caso 100% OK → sem banner, sem warns.
