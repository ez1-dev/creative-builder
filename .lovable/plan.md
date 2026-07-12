## Integração da DRE Configurável à API principal (`/api/contabil/*`)

Migrar todas as chamadas do frontend da DRE Configurável da rota antiga `/api/dre/*` para as novas rotas `/api/contabil/*` servidas pela mesma API ERP (porta 8070, `VITE_API_BASE_URL`).

### Diagnóstico
Busca no repositório mostrou que **nenhuma** URL antiga hardcoded (`8090`, `dreconfiguravel.ngrok`, `VITE_DRE_API_URL`) permanece — todas as chamadas já passam por `getApiUrl()`/`api.*` que resolve `VITE_API_BASE_URL`. Portanto o único trabalho é **renomear o prefixo dos endpoints**, além de padronizar tratamento de erros e adicionar a checagem inicial de saúde.

Arquivos afetados (apenas os que chamam `/api/dre/*` — DRE Configurável):
- `src/lib/bi/dreConfiguravelApi.ts` — painel realizado + listagem de modelos.
- `src/lib/bi/dreMontadorModelosApi.ts` — CRUD de modelos e linhas do montador.
- `src/components/bi/financeiro/DreMensalTable.tsx` — só um comentário `TODO` com URL antiga.
- `src/pages/bi/financeiro/DreConfiguravelPainelPage.tsx` — texto de rodapé documentando as rotas.

**Não** serão alteradas:
- `/api/contabilidade/*` (contabilidade legada — balanço patrimonial etc.).
- `/api/bi/contabilidade/*` (DRE Dinâmica antiga, plano de contas, drills, sincronizações). Explicitamente fora do escopo pedido pelo usuário.
- `/api/erp/plano-contas` e demais rotas ERP compartilhadas.

### 1. Renomear endpoints `/api/dre/*` → `/api/contabil/*`

| Antigo | Novo |
| --- | --- |
| `GET /api/dre/modelos` | `GET /api/contabil/modelos` |
| `POST /api/dre/modelos` | `POST /api/contabil/modelos` |
| `PATCH /api/dre/modelos/{id}` | `PATCH /api/contabil/modelos/{id}` |
| `GET /api/dre/linhas?modelo_id=` | `GET /api/contabil/linhas?modelo_id=` |
| `POST /api/dre/linhas` | `POST /api/contabil/linhas` |
| `PATCH /api/dre/linhas/{id}` | `PATCH /api/contabil/linhas/{id}` |
| `DELETE /api/dre/linhas/{id}` | `DELETE /api/contabil/linhas/{id}` |
| `GET /api/dre/realizado/resumo` | `GET /api/contabil/realizado/resumo` |
| `GET /api/dre/realizado/contas` (TODO) | `GET /api/contabil/realizado/contas` |

Atualizar também os textos/logs (`console.log('[DRE CONFIGURAVEL] GET /api/dre/...')`) e o parágrafo informativo em `DreConfiguravelPainelPage.tsx` para refletirem `/api/contabil/*`.

### 2. Padronização de erros da DRE
Criar helper `src/lib/bi/dreErrors.ts` com `describeDreError(err)` que retorna a mensagem final a exibir, aplicando esta ordem:

1. `err.response?.data?.detail` ou `err.detail`
2. `err.response?.data?.message` ou `err.message`
3. Diagnóstico por sintoma:
   - `TypeError`/`Failed to fetch`/timeout na chamada principal → **"Não foi possível acessar a API contábil. Verifique se a API ERP está em execução na porta 8070."**
   - Mensagem contém `172.16.137.100:1433`, `timeout SQL`, `pymssql`, `pyodbc`, `SQL Server` → **"A API está online, mas não conseguiu acessar o banco do ERP. Verifique a VPN ou a conexão com o servidor Senior."**
   - HTTP 404 → **"Rota da DRE não encontrada na API principal. Verifique se a versão integrada do backend foi reiniciada."**
4. Fallback: mensagem original.

Aplicar em:
- `dreConfiguravelApi.ts` (substitui o `rethrowAuthAware` — 401 continua tratado).
- `dreMontadorModelosApi.ts` (wrap em `call()`).
- Chamadas de `useQuery`/mutations nas telas: `DreConfiguravelPainelPage` e diálogos `ModeloFormDialog`/`LinhaFormDialog` — usar `describeDreError` no `onError`/`ErrorState`.

### 3. Health check inicial
Criar hook `useDreApiHealth()` em `src/lib/bi/dreErrors.ts` (ou arquivo adjacente) que, ao montar telas da DRE, faz `GET ${VITE_API_BASE_URL}/openapi.json` uma vez por sessão (com `staleTime` grande). Se falhar por rede → mostra banner "API contábil offline"; se responder → considera API OK. Uma falha subsequente em rota de dados que seja de banco não deve derrubar o banner (mensagens distintas).

Aplicar o banner no topo de `DreConfiguravelPainelPage` e nas telas de configuração (`DreConfiguracaoPage`, `DreDinamicaPage` continuam usando rotas antigas — mas o banner só aparece quando a checagem falha, então não bloqueia).

### 4. Cliente HTTP com token opcional
`authHeaders()` já envia `Authorization` apenas se `api.getToken()` existir — comportamento correto. Manter como está; validar nos dois arquivos.

### 5. Verificação
- Rodar `rg` após as mudanças para confirmar zero ocorrências de `/api/dre/` em `src`.
- Playwright: abrir `/bi/financeiro/dre-configuravel-painel`, aguardar `openapi.json`, disparar filtros e conferir que as requisições vão para `/api/contabil/modelos`, `/api/contabil/linhas`, `/api/contabil/realizado/resumo` via Network. Capturar screenshot.

### Fora de escopo
- Não mexer em `/api/contabilidade/*` nem `/api/bi/contabilidade/*`.
- Não criar variável de ambiente exclusiva para DRE.
- Não expor `SUPABASE_SERVICE_ROLE_KEY`/credenciais SQL no frontend (já não estão).
- Sem alterações em tabelas do Cloud/Supabase.

### Entrega
Ao concluir, informarei: arquivos alterados, URLs antigas removidas, variável de ambiente (`VITE_API_BASE_URL`), endpoints DRE agora em uso, quaisquer 404 residuais e resultado da verificação Playwright.
