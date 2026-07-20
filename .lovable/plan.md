## Objetivo
Destravar o botão **Enviar requisição** em `/requisicoes/nova-op` configurando `VITE_API_BASE_URL` para o FastAPI do usuário. Sem essa variável, o preview chama `/api/requisicoes/sid/ping` contra si mesmo, recebe 404 e a UI marca a integração como **Desabilitada / Inalcançável**, bloqueando o envio.

## Passos

1. **Adicionar `VITE_API_BASE_URL` ao `.env`**
   - Valor: `https://api-erp-renato.ngrok.app`
   - Mantém as chaves auto-geradas do Lovable Cloud intactas — só acrescenta a linha nova.
   - Como é `VITE_*`, o Vite injeta em build time; ao salvar, o dev server reinicia e o preview passa a apontar para o FastAPI real.

2. **Reiniciar o dev server** para carregar a nova variável (o Vite exige restart quando o `.env` muda).

3. **Validar no preview via Playwright**
   - Abrir `/requisicoes/nova-op` autenticado.
   - Confirmar no console que o warning `VITE_API_BASE_URL não definido` desapareceu.
   - Confirmar no network que `GET https://api-erp-renato.ngrok.app/api/requisicoes/sid/ping` retorna 200 com `sid_habilitado: true`.
   - Confirmar que o chip/banner some no passo 4 e o botão **Enviar requisição** fica habilitado.
   - Se o ping retornar 401 → aparece "Sessão expirada" com botão Login (comportamento correto).
   - Se retornar 503 → aparece "SID desabilitado" com detalhe do backend (comportamento correto).

## Fora de escopo
- Não vou disparar um envio real ao ERP no teste (evita movimentar estoque). A validação é: ping OK + botão habilitado.
- Não vou mexer no fluxo de OP em si — o código já está correto; só falta conectividade.
- O warning de "React has detected a change in the order of Hooks" no `AppLayout` vem de outro módulo (DemoMode) e não afeta este bug; fica para outro turno.

## Detalhes técnicos
- `src/lib/api.ts::getApiBaseUrl()` lê `import.meta.env.VITE_API_BASE_URL` e só cai no fallback (`window.location.origin`) quando ausente.
- `useSidStatus` (`src/hooks/requisicoes/index.ts`) chama `GET /api/requisicoes/sid/ping`; qualquer 404/Network vira `kind: 'inalcancavel'` em `useSidWriteEnabled`, o que desabilita o botão de envio no passo 4 da OP.
- Nenhuma alteração de código é necessária — apenas a variável de ambiente.
