## Objetivo

Trocar o tracking atual (insert direto no banco) por uma chamada **POST /api/navegacao/log** com fallback para edge function, adicionar **HEARTBEAT a cada 60s**, e criar uma **aba "Navegação ERP Web"** dentro do Monitor de Usuários Senior.

## 1. Migration — ampliar enum de ação

```sql
ALTER TYPE public.navegacao_acao ADD VALUE IF NOT EXISTS 'ABRIU_TELA';
ALTER TYPE public.navegacao_acao ADD VALUE IF NOT EXISTS 'HEARTBEAT';
ALTER TYPE public.navegacao_acao ADD VALUE IF NOT EXISTS 'TROCOU_TELA';
ALTER TYPE public.navegacao_acao ADD VALUE IF NOT EXISTS 'FECHOU_TELA';

-- Novos campos exigidos pelo payload
ALTER TABLE public.usu_log_navegacao_erp
  ADD COLUMN IF NOT EXISTS path_url      text,
  ADD COLUMN IF NOT EXISTS observacao    text,
  ADD COLUMN IF NOT EXISTS origem_evento text NOT NULL DEFAULT 'ERP_WEB';

-- View existente continua válida (não cita os novos campos).
```

> Os valores antigos (`entrar/sair/click/erro`) ficam preservados — sem breaking change.

## 2. Edge Function `navegacao-log` (fallback)

`supabase/functions/navegacao-log/index.ts`:
- Valida JWT via `supabase.auth.getClaims(token)` → obtém `user_id` e email.
- Busca `erp_user` em `profiles` (service role).
- Captura **IP** dos headers `x-forwarded-for` / `cf-connecting-ip` / `x-real-ip`.
- Captura **user_agent** de `req.headers.get('user-agent')`.
- Valida body com Zod: `sistema, cod_tela, nome_tela, acao, path_url, observacao?, session_id, computador?, origem_evento?`.
- Faz `INSERT` em `usu_log_navegacao_erp` (mapeia `cod_tela→tela_codigo`, `nome_tela→tela_nome`).
- CORS completo. Retorna `{ ok: true, id }`.

`supabase/config.toml`: adiciona bloco da função (default `verify_jwt = false` — validação é feita em código com `getClaims`).

## 3. Frontend — cliente híbrido

### `src/lib/navegacaoLogger.ts` (novo)
- `postLog(payload)`:
  1. Tenta `api.post('/api/navegacao/log', payload)` (FastAPI). Timeout curto (3s).
  2. Se falhar (network/CORS/404/timeout), faz fallback para a edge function via `supabase.functions.invoke('navegacao-log', { body: payload })`.
  3. Lembra qual canal funcionou por ~60s para evitar tentar o canal morto a cada navegação.
- `logAbriuTela(path)`, `logTrocouTela(path)`, `logFechouTela(path)`, `logHeartbeat(path)` — todos montam o payload com `sistema='ERP_WEB'`, `session_id` (do `getSessionId()` que já existe), `computador = navigator.platform`, `origem_evento='ERP_WEB'`, `cod_tela`/`nome_tela` resolvidos pelo `screenCatalog`.

### `src/components/UserTrackingProvider.tsx`
- Trocar `trackNavegacao(...)` (insert direto) por `logAbriuTela / logTrocouTela`.
- Iniciar `setInterval` de **60s** que chama `logHeartbeat(window.location.pathname)` enquanto autenticado. Limpar no logout/unmount.
- `beforeunload` → `logFechouTela()` (best-effort com `navigator.sendBeacon` para a URL do FastAPI; senão fire-and-forget).

### `src/lib/userTracking.ts`
- Manter `trackPageView` e `trackAction` (eles gravam em `user_activity`, é outro log — sessão/heartbeat de presença). 
- Remover `trackNavegacao` antigo (substituído pelo novo módulo) e o `bindNavegacaoUnload` antigo.

## 4. Tela admin — "Navegação ERP Web" como nova aba

### `src/pages/MonitorUsuariosSeniorPage.tsx`
- Envolver o conteúdo atual num `<Tabs>` com 2 abas:
  - **Sessões Senior** (tudo que já existe hoje).
  - **Navegação ERP Web** (novo — `<MonitorNavegacaoSection />`).

### `src/components/erp/MonitorNavegacaoSection.tsx` (novo)
Lê da view `vw_ultima_tela_usuario` e exibe:
| Usuário | Email | Última tela | Ação | Há quantos minutos | Computador | Sistema | Status |
|---|---|---|---|---|---|---|---|

- "Há quantos minutos" = `now() - ultima_navegacao` em minutos.
- **Status**: `ativo` se a última linha com `acao='HEARTBEAT'` desse usuário for ≤ 5 min; senão `inativo`. Faz uma 2ª query agrupada `MAX(created_at) FILTER (WHERE acao='HEARTBEAT') GROUP BY user_id` para isso.
- Auto-refresh 30s (toggle).
- Filtros: busca por usuário, filtro de status (ativo/inativo/todos), filtro de sistema.
- Botão **Exportar CSV**.

### Permissão
- Aba é renderizada se: `is_admin(auth.uid())` **OU** o usuário tem `profile_screens.can_view = true` para `screen_path='/monitor-usuarios-senior'` com sub-permissão `screen_path='/monitor-usuarios-senior/navegacao'`.
- Para simplificar e seguir o padrão atual: cadastrar a screen `/monitor-usuarios-senior` em `profile_screens` (já existe) — quem entra na página, vê as duas abas. Sem nova screen separada.
- RLS da tabela já está correto: admin lê tudo, usuário comum só o próprio. A aba só faz sentido para admin (usuário comum veria só a si próprio).

## 5. Resultado

```text
Monitor de Usuários Senior
┌─[ Sessões Senior ]─[ Navegação ERP Web ]──────────────────┐
│ [Buscar…] [Status: Todos ▾] [Auto: 30s] [Exportar CSV]    │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Usuário | Última tela | Ação      | Há min | Status   │ │
│ │ joao    | Dashboard   | HEARTBEAT | 1 min  | • ativo  │ │
│ │ maria   | Passagens   | ABRIU…    | 12 min | • inat.  │ │
│ └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## 6. Arquivos

Criados:
- `supabase/functions/navegacao-log/index.ts`
- `src/lib/navegacaoLogger.ts`
- `src/components/erp/MonitorNavegacaoSection.tsx`

Editados:
- `src/components/UserTrackingProvider.tsx`
- `src/lib/userTracking.ts` (remove tracking antigo de navegação)
- `src/pages/MonitorUsuariosSeniorPage.tsx` (envolve em Tabs)
- `supabase/config.toml` (registra a função)

Migration: ampliação do enum + colunas novas.
