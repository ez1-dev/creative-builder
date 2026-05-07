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