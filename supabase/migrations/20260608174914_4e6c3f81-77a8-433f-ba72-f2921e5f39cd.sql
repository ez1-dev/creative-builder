create table if not exists public.bi_produto (
  cd_produto text primary key,
  ds_produto text,
  cd_familia text,
  cd_origem text,
  cd_unidade_medida text,
  tipo_item text,
  ativo boolean default true,
  atualizado_em timestamptz default now()
);
create index if not exists idx_bi_produto_ds_produto on public.bi_produto (ds_produto);

grant select on public.bi_produto to authenticated;
grant all on public.bi_produto to service_role;

alter table public.bi_produto enable row level security;

drop policy if exists "bi_produto leitura autenticada" on public.bi_produto;
create policy "bi_produto leitura autenticada"
  on public.bi_produto for select to authenticated using (true);