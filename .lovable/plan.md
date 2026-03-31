

# Fix: Recursão Infinita nas Policies RLS da Tabela `profiles`

## Problema
O erro `infinite recursion detected in policy for relation "profiles"` ocorre porque as policies "Admins can read all profiles" e "Admins can update all profiles" fazem JOIN com a própria tabela `profiles` para verificar se o usuário é admin. Isso causa recursão infinita — a policy precisa ler `profiles` para avaliar se pode ler `profiles`.

## Solução

### 1. Migração SQL
- Criar função `SECURITY DEFINER` chamada `is_admin(uid uuid)` que verifica se o usuário é administrador consultando `user_access` + `access_profiles` + `profiles` **sem passar por RLS** (porque `SECURITY DEFINER` bypassa RLS)
- Dropar as 4 policies existentes da tabela `profiles`
- Recriar as policies usando a nova função `is_admin()` em vez do subselect com JOIN em `profiles`

```sql
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_access ua
    JOIN access_profiles ap ON ap.id = ua.profile_id
    JOIN profiles p ON upper(p.erp_user) = upper(ua.user_login)
    WHERE p.id = _uid AND ap.name = 'Administrador'
  );
$$;
```

Policies reescritas:
- **Users can read own profile**: `auth.uid() = id` (sem mudança)
- **Users can update own profile**: `auth.uid() = id` (sem mudança)
- **Admins can read all profiles**: `public.is_admin(auth.uid())`
- **Admins can update all profiles**: `public.is_admin(auth.uid())`

### 2. Nenhuma mudança no frontend
O código já está correto — o problema é exclusivamente nas policies do banco.

