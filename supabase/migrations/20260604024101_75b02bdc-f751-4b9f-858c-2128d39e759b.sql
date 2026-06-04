CREATE OR REPLACE VIEW public.v_bi_faturamento_comercial AS
SELECT
  f.id,
  f.id_nf,
  f.cd_nf,
  f.cd_cliente,
  f.cd_estado,
  f.cd_cidade,
  f.cd_prj,
  f.ds_abr_prj,
  f.cd_fpj,
  f.ds_abr_fpj,
  f.cd_grupo_cliente,
  f.cd_representante,
  f.cd_tns,
  f.dt_emissao,
  f.ano_emissao,
  f.anomes_emissao,
  f.mes_emissao,
  f.fonte_acao,
  CASE WHEN f.cd_prj = '12' THEN 'GENIUS' ELSE 'ESTRUTURAL ZORTEA' END AS unidade_negocio,
  COALESCE(f.qtd_produtos, 0) AS qtd_produtos,
  COALESCE(f.vl_bruto, 0)    AS vl_bruto,
  COALESCE(f.vl_devolucao, 0) AS vl_devolucao,
  (COALESCE(f.vl_icms,0) + COALESCE(f.vl_ipi,0) + COALESCE(f.vl_pis,0)
   + COALESCE(f.vl_cofins,0) + COALESCE(f.vl_iss,0) + COALESCE(f.vl_ismsst,0)
   + COALESCE(f.vl_difal,0)) AS impostos,
  (COALESCE(f.vl_bruto,0)
   + COALESCE(f.vl_icms,0) + COALESCE(f.vl_ipi,0) + COALESCE(f.vl_pis,0)
   + COALESCE(f.vl_cofins,0) + COALESCE(f.vl_iss,0) + COALESCE(f.vl_ismsst,0)
   + COALESCE(f.vl_difal,0)) AS vl_liquido
FROM public.bi_faturamento f
WHERE f.fonte_acao = 'VM_FATURAMENTO';

GRANT SELECT ON public.v_bi_faturamento_comercial TO authenticated;
GRANT SELECT ON public.v_bi_faturamento_comercial TO service_role;