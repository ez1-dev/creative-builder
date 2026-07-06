## Objetivo
Adicionar botão "Exportar Excel" na página RH-03 (Contrato Experiência), chamando `GET /api/rh/contrato-experiencia/exportar?codemp=1` no mesmo padrão do RH-04.

## Alterações

### 1. `src/lib/rh/api.ts` — nova função `exportarContratoExperienciaExcel`
Cópia adaptada de `exportarProgramacaoFeriasExcel`:
- URL: `${getApiUrl()}/api/rh/contrato-experiencia/exportar?codemp=<codemp>`
- Header `Authorization: Bearer <token>` via `api.getToken()` + `ngrok-skip-browser-warning: true`
- Trata 401 (`Sessão expirada`), 404/405/501 (`Exportação ainda não disponível no backend`), demais status como erro genérico
- Retorna `{ blob, filename }`, extraindo filename do `Content-Disposition` (fallback `rh03_contrato_experiencia_<codemp>.xlsx`)

### 2. `src/pages/rh/ContratoExperienciaPage.tsx` — botão + handler
- Importar `Button`, `FileSpreadsheet`, `Loader2`, `useState`, `exportarContratoExperienciaExcel`
- Estado `exportando` (boolean)
- Handler `exportar()`:
  1. `setExportando(true)`
  2. `const { blob, filename } = await exportarContratoExperienciaExcel(codemp)`
  3. Criar `URL.createObjectURL`, disparar download via `<a>` temporário, `URL.revokeObjectURL`
  4. `toast.success("Excel gerado")`
  5. Catch: 401 → "Sessão expirada"; código `ENDPOINT_INDISPONIVEL`/status 404-405-501 → "Exportação pendente na API"; senão `toast.error(msg)`
  6. Finally: `setExportando(false)`
- Renderizar botão à direita do `RhPageHeader` (mesmo layout dos outros RHs): 
  `<Button variant="outline" onClick={exportar} disabled={exportando || isLoading}>` com ícone spinner/planilha e texto "Exportar Excel".

### Fora do escopo
- Endpoint backend (já existe conforme mensagem do usuário; só precisa reiniciar a 8070).
- Ajuste de timezone em `formatDateBR` e revisão da fórmula "Férias Vencidas = 17" — pendências marcadas como não-código na mensagem do usuário.
- Nenhuma mudança nos KPIs, tabela, drills ou lógica de dados.