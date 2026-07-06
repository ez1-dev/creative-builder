## Diagnóstico
A rede mostra `GET /api/rh/quadro-colaboradores/export?data_ref=... → 404`. O usuário listou os endpoints oficiais como `/exportar` (pt), não `/export`. Os RH-01, RH-03 e RH-04 já usam `/exportar`; só o RH-02 está com o path em inglês.

## Alteração

### `src/lib/rh/quadroDashboardApi.ts` — função `exportQuadroDashboard` (linha ~450)
Trocar a URL:
- de: `${getApiUrl()}/api/rh/quadro-colaboradores/export?${qs}`
- para: `${getApiUrl()}/api/rh/quadro-colaboradores/exportar?${qs}`

Nada mais muda (headers, tratamento 404/405/501 → `ExportQuadroIndisponivelError`, retorno Blob permanecem iguais).

## Fora do escopo
- Nenhuma alteração no backend nem em outras telas RH.
- Sem mudanças no botão, toasts ou lógica da página.