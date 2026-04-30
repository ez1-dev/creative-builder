## Objetivo

Adicionar, na seção **Configurações → Monitoramento de Usuários → Online agora**, uma ação para o admin **derrubar a conexão de um usuário** (forçar logout remoto).

## Como funcionará (UX)

- Cada linha da tabela "Online agora" ganha uma coluna **Ações** com botão `Derrubar` (ícone `LogOut`, variante destrutiva).
- Ao clicar, abre confirmação ("Derrubar a conexão de {nome/email}?").
- Após confirmar:
  - Backend invalida a sessão Supabase do usuário (signOut global → revoga refresh tokens).
  - Marca uma flag `force_logout_at` em `user_sessions` para sinalizar ao cliente.
  - Toast: "Conexão derrubada. O usuário será desconectado em segundos."
- No cliente de qualquer usuário logado, um pequeno listener (em `UserTrackingProvider`) verifica a cada heartbeat se `force_logout_at > sessionStartedAt` e, se sim, chama `logout()` automaticamente e redireciona para `/login` com toast "Sua sessão foi encerrada por um administrador."

## Mudanças técnicas

### 1. Banco (migração)

- Adicionar coluna `force_logout_at timestamptz null` em `public.user_sessions`.
- Criar função SQL `public.force_user_logout(_user_id uuid)`:
  - `SECURITY DEFINER`, `search_path=public`
  - Checa `is_admin(auth.uid())`; se não, `RAISE EXCEPTION`.
  - `UPDATE public.user_sessions SET force_logout_at = now() WHERE user_id = _user_id`.
  - Retorna `void`.
- Política RLS: nenhuma nova necessária (admins já leem `user_sessions`; a função roda como definer).

### 2. Edge Function `admin-force-logout` (nova)

- Verifica JWT do chamador, busca `auth.uid()` e valida `is_admin` via `supabase.rpc('is_admin', { _uid })`.
- Usa `SUPABASE_SERVICE_ROLE_KEY` para chamar `supabaseAdmin.auth.admin.signOut(targetUserId, 'global')` — revoga todos os refresh tokens do alvo.
- Em seguida chama a RPC `force_user_logout` para marcar o flag (fallback do client).
- Retorna `{ ok: true }`.
- Configurada com `verify_jwt = true` (default).

### 3. Frontend — `MonitoramentoUsuarios.tsx`

- Nova coluna **Ações** na tabela "Online agora".
- Botão `Derrubar` chama `supabase.functions.invoke('admin-force-logout', { body: { userId } })`.
- Após sucesso, refaz `fetchOnline()`.

### 4. Frontend — detecção no cliente (`UserTrackingProvider.tsx`)

- Guardar `sessionStartedAt = Date.now()` em ref ao montar.
- No heartbeat (`startHeartbeat` em `src/lib/userTracking.ts`), após upsert, ler `force_logout_at` da própria linha; se existir e for posterior a `sessionStartedAt`, disparar `supabase.auth.signOut()` e `window.location.href = '/login'` com `toast.error('Sua sessão foi encerrada por um administrador.')`.
- Como `signOut` global da edge function já invalida o refresh token, na próxima troca de token o cliente também cai sozinho — o flag apenas acelera (UX imediata, ~60s).

## Arquivos afetados

- `src/components/erp/MonitoramentoUsuarios.tsx` — coluna Ações + botão.
- `src/lib/userTracking.ts` — heartbeat lê `force_logout_at` e dispara logout.
- `src/components/UserTrackingProvider.tsx` — passa callback de logout para tracking.
- `supabase/functions/admin-force-logout/index.ts` — nova edge function.
- Migração SQL — coluna + função `force_user_logout`.

## Notas

- Não aparece a opção para o próprio admin logado (oculta linha self).
- Se a edge function falhar ao chamar `auth.admin.signOut`, ainda assim o flag em `user_sessions` força o logout local na próxima batida do heartbeat.