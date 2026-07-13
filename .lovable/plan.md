O erro `HTTP 404 Not Found` em `GET https://dreconfiguravel.ngrok.app/api/contabil/dre/matriz?anomes_ini=202601&anomes_fim=202612&...` vem do backend FastAPI (porta 8070), não do frontend.

O cliente do frontend já está correto:
- Base URL: `https://dreconfiguravel.ngrok.app` (via `getContabilBaseUrl`)
- Path: `/api/contabil/dre/matriz`
- Headers: `Authorization: Bearer <jwt>` + `ngrok-skip-browser-warning: true`
- Query params conforme o contrato documentado em `docs/backend-dre-api-integrada.md`

Backend respondeu `{"detail":"Not Found"}` — sinal clássico do FastAPI quando a rota não foi registrada no app ativo.

## Ação (backend, fora do escopo do frontend)

1. Reiniciar a aplicação FastAPI unificada na porta local 8070.
2. Confirmar que o túnel `dreconfiguravel.ngrok.app` está apontado para a porta 8070 (não para a antiga 8090).
3. Validar que os endpoints da DRE estão registrados no `app` principal, todos com prefixo `/api/contabil`:
   - `GET  /api/contabil/health`
   - `GET  /api/contabil/dre/matriz`
   - `POST /api/contabil/dre/sincronizar`
   - `POST /api/contabil/dre/recalcular`
   - `GET  /api/contabil/dre/conciliacao-bi`
4. Testes rápidos após reiniciar:
   ```
   curl -H "ngrok-skip-browser-warning: true" https://dreconfiguravel.ngrok.app/api/contabil/health
   curl -H "ngrok-skip-browser-warning: true" -H "Authorization: Bearer <jwt>" \
     "https://dreconfiguravel.ngrok.app/api/contabil/dre/matriz?anomes_ini=202601&anomes_fim=202612"
   ```
   Ambos devem responder 200. Se `/health` responde 200 mas `/dre/matriz` continua 404, a rota específica não foi incluída no router — revisar o `include_router` do módulo DRE no `main.py` da API integrada.

## Frontend

Nenhuma alteração. A tela já sinaliza corretamente o 404 com a mensagem “Rota da DRE não encontrada na API principal. Verifique se a versão integrada do backend foi reiniciada.” (via `describeDreError` → `kind: 'not_found'`). Após o backend voltar, basta clicar em **Atualizar tela** que os dados carregam.
