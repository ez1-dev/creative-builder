## Objetivo
Parar de gerar XLSX no navegador (que só contém a página visível/linhas carregadas) e passar a baixar o arquivo completo produzido pelo backend, tanto no cabeçalho de `/bi/comercial` (export completo, 10 abas) quanto no drawer de drill (export do drill atual, 1 aba com tudo).

## Endpoints (confirmados pelo usuário)
- **Completo** — `POST /api/bi/comercial/exportar`  
  Body = mesmo `DrillPayload` usado no drill (`drill_type` e paginação são ignorados). Query opcional `?dimensoes=MENSAL,CLIENTE` (vazio = todas 10 abas). Timeout ~14s → usar **60s**.
- **Drill atual** — `POST /api/bi/comercial/drill/export?formato=xlsx`  
  Body = `DrillPayload` completo (inclui `nf_context`/`somente_devolucao`/`somente_impostos`/`busca`/`contexto`). Retorna 1 aba com o conjunto inteiro.

Resposta: binário XLSX. Nome do arquivo em `Content-Disposition` (já exposto via CORS).

## Mudanças no frontend

### 1. `src/lib/bi/comercialDrillApi.ts`
- Nova função `downloadComercialExportCompleto(payload: DrillRequest, opts?: { dimensoes?: string[] })`:
  - Monta URL `${getApiUrl()}/api/bi/comercial/exportar` + `?dimensoes=...` se informado.
  - `fetch` `POST` com `Authorization: Bearer …` (via `api.getToken()`), `ngrok-skip-browser-warning: true`, `Content-Type: application/json`, corpo = payload serializado (mesmo shape do drill; `page`/`page_size` podem ser omitidos).
  - `AbortController` com **60 000 ms**.
  - Se `!response.ok`: tentar `await response.text()` e parsear JSON para pegar `detail`/`message`; lançar `Error(msg)` — **sem fallback local**.
  - Ler blob, extrair filename via helper `parseContentDisposition(headers)` (fallback `bi-comercial-faturamento-${ini}-${fim}.xlsx`), disparar download via `<a download>` + `URL.revokeObjectURL`.
- Nova função `downloadComercialDrillExport(payload: DrillRequest, formato: 'xlsx' | 'csv' = 'xlsx')` seguindo o mesmo padrão contra `/api/bi/comercial/drill/export?formato=…`. Fallback de filename: `drill-${drill_type.toLowerCase()}${suffix devoluções/impostos}.xlsx`.
- Marcar `downloadDrillCsv` e `downloadDrillXlsx` (geração local) como `@deprecated` e deixar de usá-las (podem ser removidas no futuro; mantidas por segurança).

### 2. `src/components/bi/drill/ComercialDrillDrawer.tsx`
- Trocar o `onClick` dos botões **CSV** e **Excel** para chamar `downloadComercialDrillExport(payloadAtual, 'csv' | 'xlsx')`, onde `payloadAtual` é exatamente o `DrillRequest` usado no `useQuery` (inclui `contexto`, `nf_context`, `busca`, `unidade_negocio`, período).
- Adicionar estado `exportando` (bool) — botão fica `disabled` e mostra `Loader2` + label "Gerando Excel…" / "Gerando CSV…" enquanto roda.
- `toast.info("Exportando todos os resultados dos filtros selecionados. Pode levar alguns segundos.")` ao iniciar; `toast.success("Excel gerado com sucesso.")` no fim; `toast.error(msg)` com a mensagem do backend em caso de falha — sem fallback local.
- Nome do arquivo: preferir header, senão manter sufixo `nfFilenameSlug`.

### 3. `src/pages/bi/ComercialPage.tsx`
- Adicionar botão **"Exportar Excel completo"** na toolbar principal (ao lado do seletor de período/unidade), habilitado quando houver período válido.
- Handler chama `downloadComercialExportCompleto(payload)` onde `payload` reflete os filtros base atuais da página: `anomes_ini`, `anomes_fim`, `unidade_negocio`, `contexto` vazio (ou com o que já estiver aplicado como drill global), `drill_type: 'NOTA_FISCAL'` (placeholder — backend ignora).
- Mesmo estado `exportando`, mesma UX de toasts, botão `disabled` enquanto roda. Tooltip: "Gera XLSX com 10 abas (Detalhe, Mensal, Cliente, Produto, Revenda, Obra, Estado, Impostos, Acumulado, Parâmetros). Pode levar ~15 s."

### 4. Helper compartilhado
- Extrair `parseContentDisposition(headers: Headers): string | null` em `src/lib/bi/comercialDrillApi.ts` (ou reutilizar o já existente em `ExportButton.tsx` movendo para `src/lib/download.ts` se ficar limpo — decisão: manter local no arquivo do BI para não mexer em outros módulos).

## O que NÃO muda
- Nenhuma alteração em cálculo, RPCs, ETL, filtros, cards, KPIs, drills lógicos ou preservação de `nfContext`.
- `ExportButton.tsx` genérico e outras páginas continuam como estão.
- Geração local via `XLSX` (`downloadDrillXlsx`/`downloadDrillCsv`) deixa de ser chamada mas permanece no arquivo por ora (fácil rollback).

## Validação
1. Preview `GENIUS`, `202601 → 202601`: clicar **Exportar Excel completo** → download com 10 abas; total da aba Detalhe ≈ R$ 35.513.699,84 (referência).
2. Abrir drill **Devolução** (`somente_devolucao: true`), clicar **Excel** → arquivo com o recorte de devoluções, sem cair na lista completa.
3. Simular erro (unidade/período inválidos) → toast com `detail` do backend, nenhum arquivo baixado.
4. Confirmar via Network que o request usa `POST` com body JSON completo e nenhuma chamada paralela de paginação sai do front.
