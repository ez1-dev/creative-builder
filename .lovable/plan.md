## Objetivo

Ajustar o drill de Nota Fiscal do BI Comercial para que cada card (Devolução, Impostos, Notas Fiscais) envie ao backend as flags `somente_devolucao` / `somente_impostos` sem filtrar/recortar nada no frontend.

## Escopo (arquivos alterados)

- `src/lib/bi/comercialDrillApi.ts`
- `src/hooks/useComercialDrillStack.ts`
- `src/components/bi/drill/ComercialDrillDrawer.tsx`
- `src/pages/bi/ComercialPage.tsx`

## Mudanças

### 1. Contrato do drill (`comercialDrillApi.ts`)

- Novo tipo `NotaFiscalDrillContext = 'TODAS' | 'DEVOLUCOES' | 'IMPOSTOS'`.
- Helper `buildNotaFiscalDrillFlags(ctx)` → retorna `{ somente_devolucao, somente_impostos }` booleanos.
- Estender `DrillRequest` com `somente_devolucao?: boolean` e `somente_impostos?: boolean`.
- `fetchComercialDrill`: quando `drill_type === 'NOTA_FISCAL'`, incluir as duas flags no body (sempre booleano explícito, nunca string). Também repassá-las em `diagnostico.payload_enviado`.
- `downloadDrillCsv` / `downloadDrillXlsx`: aceitar `notaFiscalContext` para nomear o arquivo (`drill-nota-fiscal-devolucoes.xlsx` etc.). Como já operam em cima do `DrillResponse` retornado, o recorte já vem correto do backend — não há filtro local a aplicar.

### 2. Stack de drill (`useComercialDrillStack.ts`)

- `DrillStackLevel` ganha `nfContext?: NotaFiscalDrillContext` (default `'TODAS'`).
- `OpenInitial` ganha `nfContext?: NotaFiscalDrillContext`.
- `openWith` / `replacePath` propagam `nfContext` para o nível. `pushDrill` reseta para `'TODAS'` (novo nível não herda recorte anterior).
- `close` já limpa tudo (INITIAL) — cobre o requisito de resetar as flags ao fechar.

### 3. Drawer (`ComercialDrillDrawer.tsx`)

- Ler `cur.nfContext` (default `'TODAS'`) e derivar `somenteDevolucao` / `somenteImpostos` via `buildNotaFiscalDrillFlags`.
- `queryKey`: incluir `somenteDevolucao`, `somenteImpostos` para não reaproveitar cache entre recortes.
- `queryFn`: passar as flags para `fetchComercialDrill`.
- Título dinâmico: quando `drill_type === 'NOTA_FISCAL'`, sufixar com `— somente devoluções` ou `— somente impostos`.
- Badge "Filtro aplicado: Devoluções" / "Impostos" ao lado do título quando aplicável.
- Estado vazio: mensagem contextual ("Nenhuma devolução encontrada…" / "Nenhum detalhe de impostos encontrado…").
- Ao trocar de recorte (mudança de `nfContext`), o `queryKey` novo já força página 1 via `cur.page` que vem `1` do `openWith`. Garantir que qualquer botão que altere recorte também chame `stack.setPage(1)`.
- Export XLSX/CSV: passar o `nfContext` para nomear o arquivo corretamente.

### 4. Página BI Comercial (`ComercialPage.tsx`)

- `KPI_DRILL_MAP`: manter `devolucao → NOTA_FISCAL`, `impostos → NOTA_FISCAL` (novo — antes ia para `DETALHES_IMPOSTOS`? confirmar via leitura antes de mudar; se hoje impostos vai para `DETALHES_IMPOSTOS`, ajustar apenas se o usuário pedir explicitamente que o card Impostos abra Nota Fiscal — o prompt diz "escolher o detalhamento por nota fiscal", então o **card em si** continua abrindo o drill natural; o recorte `IMPOSTOS` entra quando o usuário pede "Detalhar em Nota Fiscal" a partir do card).
- No handler dos cards (`renderKpi` e `openDetalhes`), passar `nfContext`:
  - Card Devolução → `openDrill('NOTA_FISCAL', {}, { resetDrillFilters: true, nfContext: 'DEVOLUCOES' })`.
  - Card Impostos → quando o destino for `NOTA_FISCAL`, `nfContext: 'IMPOSTOS'`. Quando for `DETALHES_IMPOSTOS`, não envia flags (drill separado).
  - Demais cards / drill geral de NF → `nfContext: 'TODAS'` (ou omite).
- `openDrill` propaga `nfContext` para `drillStack.openWith`.
- Remover qualquer heurística local do tipo `categoria_custom: 'devolucao'` que hoje é usada como proxy (linha 685) — substituída pela flag explícita.

### 5. Nada de filtro local

- Não filtrar linhas por `devolucao !== 0`, `icms !== 0`, sinal, TNS, texto, etc.
- Totais no rodapé continuam vindo do dataset retornado (que já é o recorte correto).
- Paginação usa `resp.total` / `resp.page` / `resp.page_size` (já é o caso hoje).

## Critérios de aceite

- Card Devolução envia `somente_devolucao=true, somente_impostos=false` e o título mostra "— somente devoluções".
- Card Impostos (via Nota Fiscal) envia `somente_devolucao=false, somente_impostos=true`.
- Drill geral de Notas continua enviando ambos `false`.
- `queryKey` inclui as flags → sem contaminação de cache entre recortes.
- Fechar o drawer zera o stack (flags voltam para `TODAS` na próxima abertura).
- Exportação nomeia o arquivo por recorte e usa o mesmo dataset já filtrado pelo backend.
- Período, empresa, filial, unidade e demais filtros permanecem no payload (já são propagados via `contexto` + parâmetros fixos).

## Fora de escopo

- Revisão de TNS de devolução (Genius).
- Alteração da lógica de busca no servidor (já existe conforme item 8 do prompt) — mantida como está; a query key das flags convive com a chave de busca já em uso.
