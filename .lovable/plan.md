## Permitir edição/exclusão de Passagens Aéreas via permissionamento

Hoje a UI já mostra os botões "Editar/Excluir/Novo/Importar" para usuários com `can_edit` em `/passagens-aereas` (via `useUserPermissions.canEdit`). Porém as políticas RLS da tabela `passagens_aereas` exigem `is_admin(auth.uid())` para INSERT/UPDATE/DELETE — então não-admins esbarram em "row-level security".

### Backend (migration)

Criar uma função helper e substituir as políticas de mutação de `passagens_aereas` para permitir admins **ou** usuários com `can_edit = true` na tela `/passagens-aereas`.

```sql
-- Helper
create or replace function public.can_edit_passagens(_uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_admin(_uid) or exists (
    select 1
    from public.user_access ua
    join public.profiles p on upper(p.erp_user) = upper(ua.user_login)
    join public.profile_screens ps on ps.profile_id = ua.profile_id
    where p.id = _uid
      and ps.screen_path = '/passagens-aereas'
      and ps.can_edit = true
  );
$$;

-- Substituir políticas
drop policy if exists "Admins can insert passagens_aereas" on public.passagens_aereas;
drop policy if exists "Admins can update passagens_aereas" on public.passagens_aereas;
drop policy if exists "Admins can delete passagens_aereas" on public.passagens_aereas;

create policy "Editors can insert passagens_aereas"
  on public.passagens_aereas for insert to authenticated
  with check (public.can_edit_passagens(auth.uid()));

create policy "Editors can update passagens_aereas"
  on public.passagens_aereas for update to authenticated
  using (public.can_edit_passagens(auth.uid()))
  with check (public.can_edit_passagens(auth.uid()));

create policy "Editors can delete passagens_aereas"
  on public.passagens_aereas for delete to authenticated
  using (public.can_edit_passagens(auth.uid()));
```

### Frontend

- `PassagensAereasPage.tsx`: o botão **"Excluir todos"** continua restrito a admin (`isAdmin`) por segurança — operação destrutiva em massa.
- Demais botões (Novo, Editar, Excluir um, Importar planilha, Compartilhar) já estão condicionados a `editAllowed = canEdit('/passagens-aereas')` — sem mudanças necessárias.

### Como liberar para um usuário

Em **Configurações → Perfis de Acesso**, marcar **"Pode editar"** na tela `/passagens-aereas` no perfil desejado. Usuários daquele perfil passam a poder criar, editar, excluir registros e importar planilhas.

Apenas administradores continuam podendo excluir TODOS os registros de uma vez.
