revoke execute on function public.get_plano_contas_dre() from public;
revoke execute on function public.get_plano_contas_dre() from anon;
grant execute on function public.get_plano_contas_dre() to authenticated;