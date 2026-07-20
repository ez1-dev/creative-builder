## Trocar marca restante para "HUB de Gestão"

Ainda restaram ocorrências visíveis da marca antiga. Vou substituir:

1. **`src/components/AppSidebar.tsx`** (linha 28) — fallback do `useBrand('ERP Sapiens')` → `useBrand('HUB de Gestão')`. É o texto do cabeçalho da sidebar mostrado no print.
2. **`src/pages/LoginPage.tsx`** (linha 79) — `<CardTitle>ERP Sapiens</CardTitle>` → `HUB de Gestão`.
3. **`src/lib/mcp/index.ts`** — `title: "Sapiens ERP"` → `"HUB de Gestão"` e descrição trocando "Sapiens Control Center ERP" por "HUB de Gestão".

Não vou mexer em:
- `public/docs/sapiens-control-center.pdf` (binário legado de documentação; renomear/regerar exige outro pedido).
- Identificador interno `sapiens-erp-mcp` no `defineMcp({ name })` (chave técnica do servidor MCP, não é texto visível).

Depois rodo `rg` final para confirmar que nenhuma string visível da marca antiga sobrou.
