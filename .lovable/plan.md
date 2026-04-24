

## Tratamento de 404 e confirmação de endpoints — Faturamento Genius

### 1. Mensagem amigável para 404
No `consultar()` e em `atualizarComercial()` de `src/pages/FaturamentoGeniusPage.tsx`, detectar `err.statusCode === 404` (já exposto pelo `api.ts`) e:
- Exibir `toast.error` com a mensagem:  
  *"Backend de Faturamento Genius ainda não publicado. Verifique se os endpoints /api/faturamento-genius-dashboard e /api/faturamento-genius existem no FastAPI."*
- Renderizar um banner inline (`Alert` destrutivo leve) acima dos KPIs com a mesma mensagem enquanto `dashboard` estiver vazio por causa do 404 — assim o usuário entende por que não há dados.
- Estado novo: `backendIndisponivel: boolean`, setado em `true` no catch de 404 e resetado em `true→false` em qualquer resposta OK.

Demais erros (500, 401, etc.) continuam tratados como já estão (`ErpConnectionAlert` para 401, `toast.error` para o restante).

### 2. Confirmação dos endpoints
Auditoria confirma que a página já chama exatamente:
- `GET /api/faturamento-genius-dashboard` (em `consultar`)
- `GET /api/faturamento-genius` (em `consultar` e paginação)
- `GET /api/export/faturamento-genius` (via `<ExportButton endpoint="...">`)
- `POST /api/faturamento-genius/atualizar` (em `atualizarComercial`)

Nenhuma alteração necessária — apenas validar que os paths estão idênticos no código após o ajuste.

### 3 e 4. Base URL via `VITE_API_BASE_URL` com fallback `window.location.origin`
Hoje `src/lib/api.ts` usa `VITE_API_URL` com fallback `'http://localhost:8000'`. Para atender ao requisito **sem quebrar outras páginas**:
- Ajustar `getApiBaseUrl()` em `src/lib/api.ts` para a ordem: `_apiBaseUrl` → `import.meta.env.VITE_API_BASE_URL` → `import.meta.env.VITE_API_URL` → `window.location.origin` (e só cair em `'http://localhost:8000'` se `window` não existir, ex.: SSR/teste).
- Isso preserva o comportamento atual de quem já usa `VITE_API_URL` e adiciona o suporte ao novo nome solicitado, com o fallback correto para `window.location.origin`.

### 5. Nota técnica preservada
A nota de rodapé (`"A revenda vem de VM_FATURAMENTO.CD_REV_PEDIDO. Para produtos, a origem é E120IPD.USU_REVPED; serviços/devoluções podem aparecer como OUTROS conforme a view atual."`) **permanece inalterada** ao final da página.

### Arquivos afetados
- `src/pages/FaturamentoGeniusPage.tsx` — tratar 404 (toast + banner) e estado `backendIndisponivel`.
- `src/lib/api.ts` — ajustar resolução do base URL (acrescentar `VITE_API_BASE_URL` e fallback `window.location.origin`).

### Garantias
- Lógica de filtros, paginação, KPIs, tabelas, exportação e atualização comercial **não muda**.
- Nenhuma outra página é afetada (mudança em `api.ts` é aditiva e mantém `VITE_API_URL` como prioridade legada).
- Sem dados mockados; sem alteração no backend.

