
CREATE TABLE public.etl_configuracoes_bi (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  descricao text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);

ALTER TABLE public.etl_configuracoes_bi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage etl_configuracoes_bi"
  ON public.etl_configuracoes_bi
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read etl_configuracoes_bi"
  ON public.etl_configuracoes_bi
  FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.etl_configuracoes_bi (chave, valor, descricao) VALUES
  ('USE_BI_ANALYTICS_COMPRAS', 'false', 'Quando true, /api/painel-compras* lê de bi_compras em vez do ERP.'),
  ('USE_BI_ANALYTICS_RECEBIMENTOS', 'false', 'Quando true, /api/notas-recebimento* lê de bi_recebimentos em vez do ERP.'),
  ('USE_DASHBOARD_CACHE', 'false', 'Quando true, dashboards consultam dashboard_cache antes de recomputar.'),
  ('DASHBOARD_CACHE_TTL_MINUTES', '5', 'TTL do dashboard_cache em minutos.'),
  ('FALLBACK_TO_ERP_WHEN_BI_EMPTY', 'true', 'Quando true, cai pro ERP se bi_* estiver vazia. False = retorna 409.')
ON CONFLICT (chave) DO NOTHING;
