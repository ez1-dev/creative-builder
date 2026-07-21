
-- Backfill: para cada menu_layout_user (e _global) que já move /contabilidade/dre-studio
-- para um subgrupo customizado, replicar o mesmo destino para /contabilidade/dre-padrao
-- e inserir a URL na ordem do subgrupo (após /contabilidade/balanco se existir).

do $$
declare
  r record;
  mv jsonb;
  top_id text;
  sub_id text;
  ord_key text;
  ord jsonb;
  new_ord jsonb;
  pos int;
begin
  for r in
    select 'user'::text as scope, user_id::text as key, layout from public.menu_layout_user
     where layout->'moves' ? '/contabilidade/dre-studio'
       and not (layout->'moves' ? '/contabilidade/dre-padrao')
    union all
    select 'global'::text, id::text, layout from public.menu_layout_global
     where layout->'moves' ? '/contabilidade/dre-studio'
       and not (layout->'moves' ? '/contabilidade/dre-padrao')
  loop
    mv := r.layout->'moves'->'/contabilidade/dre-studio';
    top_id := mv->>'topId';
    sub_id := mv->>'subGroupId';
    ord_key := case when sub_id is null or sub_id = '' then top_id else top_id || ':' || sub_id end;

    -- moves: adiciona a nova entrada copiando o destino
    r.layout := jsonb_set(r.layout, array['moves','/contabilidade/dre-padrao'], mv, true);

    -- orders: garante array e insere a URL após /contabilidade/balanco (ou no fim)
    ord := coalesce(r.layout->'orders'->ord_key, '[]'::jsonb);
    if not (ord @> '["/contabilidade/dre-padrao"]'::jsonb) then
      -- posição de /contabilidade/balanco
      select idx into pos
        from (select ordinality-1 as idx, value
                from jsonb_array_elements_text(ord) with ordinality) t
       where value = '/contabilidade/balanco'
       limit 1;

      if pos is not null then
        new_ord := (select jsonb_agg(v) from (
          select value as v, ordinality as o
            from jsonb_array_elements_text(ord) with ordinality
           where ordinality <= pos+1
          union all
          select '/contabilidade/dre-padrao', pos+1.5
          union all
          select value, ordinality
            from jsonb_array_elements_text(ord) with ordinality
           where ordinality > pos+1
        ) s order by o);
      else
        new_ord := ord || '["/contabilidade/dre-padrao"]'::jsonb;
      end if;

      r.layout := jsonb_set(r.layout, array['orders', ord_key], new_ord, true);
    end if;

    if r.scope = 'user' then
      update public.menu_layout_user
         set layout = r.layout, updated_at = now()
       where user_id::text = r.key;
    else
      update public.menu_layout_global
         set layout = r.layout, updated_at = now()
       where id::text = r.key;
    end if;
  end loop;
end$$;
