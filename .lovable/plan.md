## Problema

O usuário **LUIZ.ANTUNES@EZORTEA.COM.BR** não consegue desconectar sessões em **Monitor de Usuários Senior**, mesmo sendo administrador. O botão "Desconectar" aparece bloqueado / a checagem `canDisconnect` falha.

## Causa raiz

No banco, o Luiz tem **dois vínculos** em `user_access`:

```
LUIZ.ANTUNES@EZORTEA.COM.BR  →  Administrador
LUIZ.ANTUNES@EZORTEA.COM.BR  →  TI
```

No `src/contexts/AuthContext.tsx` (linhas 65–83), a checagem de admin faz:

```ts
const { data: access } = await supabase
  .from('user_access')
  .select('profile_id')
  .ilike('user_login', data.erp_user)
  .maybeSingle();   // ← falha silenciosamente quando há 2+ linhas
```

Como o Luiz tem 2 linhas, `.maybeSingle()` retorna `null` (PGRST116 — multiple rows), o bloco do `if (access)` é pulado, `erp_is_admin` não é setado, e em `MonitorUsuariosSeniorPage.tsx:118-119`:

```ts
const isAdmin = localStorage.getItem('erp_is_admin') === 'true';
const canDisconnect = isAdmin || (erpUser?.toUpperCase() === 'RENATO');
```

→ `canDisconnect = false`, botão Desconectar fica desabilitado/oculto.

Mesmo problema afeta `useUserPermissions` (também usa `.maybeSingle()`), então qualquer usuário com perfil duplicado fica sem permissões.

## Correção

### 1. `src/contexts/AuthContext.tsx`
Buscar **todos** os vínculos do usuário e marcar admin se **qualquer** um deles for "Administrador":

```ts
const { data: accesses } = await supabase
  .from('user_access')
  .select('profile_id, access_profiles!inner(name)')
  .ilike('user_login', data.erp_user);

const isAdmin = (accesses ?? []).some(
  (a: any) => a.access_profiles?.name === 'Administrador'
);
if (isAdmin) localStorage.setItem('erp_is_admin', 'true');
else localStorage.removeItem('erp_is_admin');
```

### 2. `src/hooks/useUserPermissions.ts`
Mesmo tratamento: trocar `.maybeSingle()` por buscar todas as linhas e **unir** as permissões de todos os perfis (OR em `can_view`/`can_edit`, OR em `ai_enabled`). Assim Luiz herda permissões de Administrador + TI.

### 3. Aviso opcional na UI de "Atribuir Perfil a Usuário"
Quando o admin tentar atribuir um perfil a um usuário que **já tem** outro perfil, mostrar toast informativo (não bloquear) — ajuda a evitar surpresas futuras. *(implementar só se o usuário pedir; fora do escopo do bug atual.)*

## Validação

- Após o fix, Luiz faz login → `localStorage.erp_is_admin === 'true'` → botão Desconectar fica habilitado em `/monitor-usuarios-senior`.
- Outros usuários com 1 perfil só continuam funcionando normalmente.
- Usuários sem vínculo continuam sem admin.

Aprova para aplicar?