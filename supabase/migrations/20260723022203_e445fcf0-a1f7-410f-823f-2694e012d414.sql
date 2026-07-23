
UPDATE public.menu_layout_user
SET layout = jsonb_set(
  layout,
  '{orders,erp:erp-financeiro}',
  to_jsonb(
    ARRAY['/contabilidade/indicadores']::text[]
    || (
      SELECT COALESCE(array_agg(x), ARRAY[]::text[])
      FROM jsonb_array_elements_text(layout->'orders'->'erp:erp-financeiro') AS x
      WHERE x <> '/contabilidade/indicadores'
    )
  ),
  true
)
WHERE layout->'orders' ? 'erp:erp-financeiro';
