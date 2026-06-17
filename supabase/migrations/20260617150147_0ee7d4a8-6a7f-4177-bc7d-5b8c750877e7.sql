create or replace function public.get_plano_contas_dre()
returns table(
  cd_mascara text,
  cd_conta_contabil text,
  qtde bigint,
  total numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(l.mascara, '') as cd_mascara,
    coalesce(l.cd_conta, '') as cd_conta_contabil,
    count(*)::bigint as qtde,
    sum(coalesce(l.vl_saldo, coalesce(l.vl_credito,0) - coalesce(l.vl_debito,0)))::numeric as total
  from public.bi_vm_lanc_contabil l
  group by coalesce(l.mascara, ''), coalesce(l.cd_conta, '')
  order by 1, 2;
$$;

grant execute on function public.get_plano_contas_dre() to authenticated;