## Objetivo
Adicionar botão "Exportar Excel" na tela RH — 01 Resumo Folha (`ResumoFolhaPage.tsx`), que baixa o arquivo do novo endpoint `GET /api/rh/resumo-folha/exportar`, reaproveitando os filtros ativos da tela e o token de autenticação atual. Sem tocar em cards, KPIs ou lógica de dados.

## Arquivos a alterar

1. **`src/lib/rh/api.ts`** — nova função `exportarResumoFolhaExcel(params)`:
   - Monta querystring com `anomes_ini`/`anomes_fim` já passados por `toAnomes`, `codemp` (default 1) e `cd_filial` quando presente.
   - Faz `fetch` para `${getApiUrl()}/api/rh/resumo-folha/exportar?...` com `Authorization: Bearer <token>` e `ngrok-skip-browser-warning: true` (mesmo padrão de `ExportButton.tsx` / `useAuthedBlobUrl.ts`).
   - Trata 401 (sessão expirada), 404 (endpoint ainda não publicado no backend), 422 (período inválido), demais erros genéricos — lançando erros tipados para o caller exibir toast.
   - Retorna `{ blob, filename }` extraindo `filename` do header `Content-Disposition` (regex igual à usada em `ExportButton.tsx`); fallback `resumo_folha_<codemp>_<ini>_<fim>.xlsx`.

2. **`src/pages/rh/ResumoFolhaPage.tsx`** — botão "Exportar Excel":
   - Colocar via prop `actions` do `RhPageHeader` (fica ao lado do `SincronizarRhDialog`, mantendo padrão visual).
   - `variant="outline"`, ícone `FileSpreadsheet` (lucide) + spinner `Loader2` durante download; desabilitado enquanto `loading`.
   - `onClick` usa `useMutation` (ou state local) chamando `exportarResumoFolhaExcel` com os mesmos filtros que já alimentam o dashboard (`anomesIni`, `anomesFim`, `codemp`, e `cd_filial` se houver filtro de filial ativo na tela).
   - Ao resolver: `URL.createObjectURL(blob)` → `<a download={filename}>` → click → `revokeObjectURL`.
   - Toasts (`sonner`): sucesso "Excel exportado", erros mapeados por código (401/404/422/genérico).

## Fora de escopo
- Nenhuma mudança em KPIs, grid de filiais, polling de sincronização ou mapeamento da API.
- Nada de navegação direta pela URL com `access_token` — usar fetch autenticado + blob, para não vazar token no histórico.

## Notas
- Endpoint só responderá após restart do backend; até lá o botão retornará 404 e o toast informará "Exportação ainda não disponível no backend".
