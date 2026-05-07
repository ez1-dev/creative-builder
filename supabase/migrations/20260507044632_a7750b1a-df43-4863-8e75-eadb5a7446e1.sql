create table public.bi_user_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_key text not null,
  section text not null,
  component_id text not null,
  title text,
  span smallint not null default 1,
  ordem int not null default 0,
  mapping jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bi_user_widgets enable row level security;

create policy "Users read own widgets" on public.bi_user_widgets
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own widgets" on public.bi_user_widgets
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own widgets" on public.bi_user_widgets
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own widgets" on public.bi_user_widgets
  for delete to authenticated using (auth.uid() = user_id);

create index bi_user_widgets_lookup_idx
  on public.bi_user_widgets (user_id, page_key, section, ordem);

create trigger bi_user_widgets_set_updated_at
  before update on public.bi_user_widgets
  for each row execute function public.update_updated_at_column();