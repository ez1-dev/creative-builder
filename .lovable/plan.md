## Objetivo

Permitir que o administrador force o logout de **um usuário específico** (já existe) **ou de todos os usuários logados de uma vez**, para forçar recarregar o sistema após deploy.

## O que já existe

- Edge function `admin-force-logout` derruba um usuário por ID (revoga refresh token + seta `force_logout_at` em `user_sessions`).
- Componente `MonitoramentoUsuarios.tsx` (tela Monitoramento) já tem botão **Derrubar** por linha.
- Cliente checa `force_logout_at` no heartbeat (via `userTracking.ts`) e cai fora automaticamente.

Falta apenas: opção **em massa**.

## Mudanças

### 1. Edge function `admin-force-logout`

Aceitar novo modo além de `userId`:

- `body.scope === 'all'` → derruba todos os usuários ativos (exceto o próprio admin que disparou), opcionalmente com filtro `onlyOnline: true` para usar apenas quem tem sessão em `user_sessions` nos últimos 2 min.
- Continua exigindo `is_admin`.
- Para cada usuário: `auth.admin.signOut(id, 'global')` + `update user_sessions.force_logout_at`.
- Retorna `{ ok, total, falhas }`.

### 2. UI em `MonitoramentoUsuarios.tsx`

No cabeçalho do card "Usuários Online" adicionar botão vermelho **"Derrubar todos"** com:

- Confirm com aviso claro ("Todos os usuários logados serão desconectados. Você continuará conectado.").
- Chamada `supabase.functions.invoke('admin-force-logout', { body: { scope: 'all', onlyOnline: true } })`.
- Toast com total derrubado.
- Botão fica desabilitado se não há ninguém online além do próprio admin.

Nenhuma outra tela é alterada. Sem mudanças de schema.

## Perguntas

Só sigo com isso, ou você prefere que o "Derrubar todos" seja mais amplo (todos os usuários da base, mesmo os que não estão com sessão ativa nos últimos 2 min)?
