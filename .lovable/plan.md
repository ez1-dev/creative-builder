## Objetivo

Adicionar botão "Exportar Excel" na página `/rh/programacao-ferias` que baixa `GET /api/rh/programacao-ferias/exportar?codemp=1` usando o mesmo padrão do export do Resumo Folha.

## Escopo

- `src/lib/rh/api.ts` — nova função `exportarProgramacaoFeriasExcel(codemp)` espelhando `exportarResumoFolhaExcel` (Bearer via header, tratamento 401/404/422, extração de filename do `Content-Disposition`, fallback `rh04_programacao_ferias_{codemp}.xlsx`).
- `src/pages/rh/ProgramacaoFeriasPage.tsx` — botão "Exportar Excel" no `actions` do `RhPageHeader`, à esquerda do "Atualizar". Estado local `isExporting`; ícone `Download` + spinner enquanto gera; dispara download via `URL.createObjectURL` + `<a download>`; toast de erro (401 → "Sessão expirada. Faça login novamente.").

Fora do escopo: backend, alterar payload, mudar formato de data da planilha (backend hoje entrega `YYYY-MM-DD` texto — se o usuário quiser `dd/MM/yyyy` depois, é ajuste no backend).

## Passos

1. Em `src/lib/rh/api.ts`, adicionar `exportarProgramacaoFeriasExcel(codemp: number | string = 1)` copiando a estrutura da função `exportarResumoFolhaExcel`: `URLSearchParams({ codemp })`, GET com `Authorization: Bearer <token>` + `ngrok-skip-browser-warning`, mesmos ramos de erro (retornando `Error` simples com `statusCode` no caso 401 — não precisa criar nova classe de erro).
2. Em `ProgramacaoFeriasPage.tsx`:
   - Importar `Download` (lucide) e a nova função.
   - Adicionar `const [isExporting, setIsExporting] = useState(false)`.
   - Função `handleExport()` que chama a API, cria `URL.createObjectURL(blob)`, um `<a>` temporário com `download=filename`, remove; em erro, `toast.error` (401 → sessão expirada).
   - No `actions` do `RhPageHeader`, envolver os botões num fragment: `<Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}><Download/Spinner /> Exportar Excel</Button>` + o botão "Atualizar" já existente.

3. Verificar com `bunx tsgo --noEmit`.
