## Objetivo

Ajustar o diagnóstico da DRE para diferenciar corretamente três estados, sem alterar URL, sem criar fallback e sem recalcular valores no frontend.

## Contexto confirmado

- `VITE_CONTABIL_API_URL=https://dreconfiguravel.ngrok.app` — **manter**.
- Nenhuma mudança em `contabilApi.ts` (URL, guardas de `:8090`, `api-erp-renato`, `.supabase.co` permanecem).
- Nenhum mock, fallback ou recálculo será introduzido.

## Mudanças (frontend apenas, camada de apresentação)

### 1. `src/components/contabil/DreApiDiagnostico.tsx`

Passar a fazer **dois** health checks em paralelo via `useQueries`:

- `pingContabilHealth()` → estado da API (`/api/contabil/health`).
- Um "probe" leve das rotas críticas ainda-não-publicadas (`/api/contabil/agendamentos` e `/api/contabil/snapshots`) — apenas para classificar o banner. Não altera nenhuma tela de dados.

Matriz de mensagens exibidas na faixa:

| Health | Probe recursos | Mensagem | Tom |
|---|---|---|---|
| ok | ok | "API contábil conectada." | ok (verde) |
| ok | 404 | "API conectada, mas o recurso solicitado ainda não foi publicado no backend." | warn (âmbar) |
| ok | 5xx com indício de banco (`sql`, `1433`, `pymssql`, `vpn`, `senior`) | "API online, mas sem conexão com o banco ERP." | warn (âmbar) |
| 404 no próprio health | — | "Rota `/api/contabil/health` não encontrada nesta versão do backend." | warn |
| network / timeout / 0 | — | "API contábil indisponível." | error (vermelho) |
| 401 | — | "Sessão expirada — refaça o login." | warn |

Regra crítica: **quando `health = ok`, nunca renderizar "API offline"**, mesmo que o probe falhe.

Botão "Testar conexão" refaz os dois probes e invalida `['dre-matriz']`.

### 2. `src/pages/bi/contabilidade/DrePage.tsx`

Nenhuma mudança estrutural. O `<DreApiDiagnostico />` já está no topo; passará a exibir a nova matriz automaticamente.

### 3. Mensagens de erro nos hooks de dados (`dreMatrizApi`, `dreConfiguravelApi`, `dreStudioApi`)

Ajustar apenas o **texto** do erro para 404, sem lógica nova:

- 404 hoje: "Rota da DRE não encontrada na API principal. Verifique se a versão integrada do backend foi reiniciada."
- 404 novo: "Este recurso ainda não está disponível na versão publicada do backend contábil."

Isso remove qualquer sugestão de "API offline" quando o problema é rota inexistente.

### 4. `DreHealthBanner.tsx` (DRE Studio)

Mesmo ajuste textual do item 3 para o caso `isNotFound`, para manter coerência entre módulos.

## O que NÃO será feito

- Não alterar URL, `.env`, guardas de host, nem apontar para `api-erp-renato.ngrok.app`.
- Não criar rotas simuladas nem mocks para `/agendamentos` ou `/snapshots`.
- Não recalcular, corrigir ou derivar valores contábeis no frontend.
- Não tocar em backend, ETL, Cloud ou Supabase.

## Critérios de aceite

- Com `health = 200` e `agendamentos = 404`: banner âmbar com "API conectada, mas o recurso solicitado ainda não foi publicado no backend."
- Com `health` inacessível: banner vermelho "API contábil indisponível."
- Com `health = 200` e erro sinalizando banco ERP: banner âmbar "API online, mas sem conexão com o banco ERP."
- Após deploy do backend, as rotas novas passam a responder 200 automaticamente sem qualquer mudança no frontend.
- `tsgo` verde; nenhum valor hardcoded ou mock adicionado.
