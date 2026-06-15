CREATE OR REPLACE FUNCTION public.bi_dre_matriz_anual(
  p_ano text,
  p_unidade_negocio text DEFAULT NULL
)
RETURNS TABLE(
  ordem integer,
  codigo_linha text,
  mascara text,
  descricao text,
  totalizadora boolean,
  nivel integer,
  jan_realizado numeric, jan_av numeric, jan_orcado numeric,
  fev_realizado numeric, fev_av numeric, fev_orcado numeric,
  mar_realizado numeric, mar_av numeric, mar_orcado numeric,
  abr_realizado numeric, abr_av numeric, abr_orcado numeric,
  mai_realizado numeric, mai_av numeric, mai_orcado numeric,
  jun_realizado numeric, jun_av numeric, jun_orcado numeric,
  jul_realizado numeric, jul_av numeric, jul_orcado numeric,
  ago_realizado numeric, ago_av numeric, ago_orcado numeric,
  set_realizado numeric, set_av numeric, set_orcado numeric,
  out_realizado numeric, out_av numeric, out_orcado numeric,
  nov_realizado numeric, nov_av numeric, nov_orcado numeric,
  dez_realizado numeric, dez_av numeric, dez_orcado numeric,
  total_realizado numeric, total_av numeric, total_orcado numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ano integer := NULLIF(p_ano, '')::integer;
BEGIN
  RETURN QUERY
  WITH estrutura AS (
    SELECT e.ordem, e.mascara, e.descricao AS e_descricao, e.totalizadora, e.nivel,
           COALESCE(e.sinal, 1) AS sinal
    FROM public.bi_dre_estrutura e
    WHERE COALESCE(e.ativo, true) = true
  ),
  lanc AS (
    SELECT m.mascara,
           (l.anomes_referente % 100)::int AS mes,
           SUM(COALESCE(l.vl_saldo, COALESCE(l.vl_credito,0) - COALESCE(l.vl_debito,0))) AS valor
    FROM public.bi_vm_lanc_contabil l
    JOIN public.bi_dre_mascara m ON m.cd_conta = l.cd_conta
    WHERE (l.anomes_referente / 100)::int = v_ano
      AND (p_unidade_negocio IS NULL
           OR m.unidade_negocio IS NULL
           OR m.unidade_negocio = p_unidade_negocio)
    GROUP BY m.mascara, (l.anomes_referente % 100)::int
  ),
  orc AS (
    SELECT o.mascara,
           (o.anomes_referente % 100)::int AS mes,
           SUM(COALESCE(o.vl_orcado, 0)) AS valor
    FROM public.bi_vm_orc_dre o
    WHERE (o.anomes_referente / 100)::int = v_ano
      AND (p_unidade_negocio IS NULL
           OR o.unidade_negocio IS NULL
           OR o.unidade_negocio = p_unidade_negocio)
    GROUP BY o.mascara, (o.anomes_referente % 100)::int
  ),
  meses AS (
    SELECT e.ordem, e.mascara, e.e_descricao, e.totalizadora, e.nivel, e.sinal,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=1),  0) * e.sinal AS r1,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=2),  0) * e.sinal AS r2,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=3),  0) * e.sinal AS r3,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=4),  0) * e.sinal AS r4,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=5),  0) * e.sinal AS r5,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=6),  0) * e.sinal AS r6,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=7),  0) * e.sinal AS r7,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=8),  0) * e.sinal AS r8,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=9),  0) * e.sinal AS r9,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=10), 0) * e.sinal AS r10,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=11), 0) * e.sinal AS r11,
      COALESCE(SUM(l.valor) FILTER (WHERE l.mes=12), 0) * e.sinal AS r12,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=1),  0) * e.sinal AS o1,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=2),  0) * e.sinal AS o2,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=3),  0) * e.sinal AS o3,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=4),  0) * e.sinal AS o4,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=5),  0) * e.sinal AS o5,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=6),  0) * e.sinal AS o6,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=7),  0) * e.sinal AS o7,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=8),  0) * e.sinal AS o8,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=9),  0) * e.sinal AS o9,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=10), 0) * e.sinal AS o10,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=11), 0) * e.sinal AS o11,
      COALESCE(SUM(o.valor) FILTER (WHERE o.mes=12), 0) * e.sinal AS o12
    FROM estrutura e
    LEFT JOIN lanc l ON l.mascara = e.mascara
    LEFT JOIN orc  o ON o.mascara = e.mascara
    GROUP BY e.ordem, e.mascara, e.e_descricao, e.totalizadora, e.nivel, e.sinal
  ),
  base AS (
    SELECT
      MAX(m.r1) AS b1, MAX(m.r2) AS b2, MAX(m.r3) AS b3, MAX(m.r4) AS b4,
      MAX(m.r5) AS b5, MAX(m.r6) AS b6, MAX(m.r7) AS b7, MAX(m.r8) AS b8,
      MAX(m.r9) AS b9, MAX(m.r10) AS b10, MAX(m.r11) AS b11, MAX(m.r12) AS b12
    FROM meses m
    WHERE upper(translate(m.e_descricao,
                          'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                          'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
          LIKE 'RECEITA LIQUIDA%'
  )
  SELECT
    m.ordem,
    upper(m.mascara) AS codigo_linha,
    m.mascara,
    m.e_descricao AS descricao,
    m.totalizadora,
    m.nivel::integer,
    m.r1, CASE WHEN COALESCE(b.b1,0)=0 THEN NULL ELSE m.r1 / b.b1 * 100 END, m.o1,
    m.r2, CASE WHEN COALESCE(b.b2,0)=0 THEN NULL ELSE m.r2 / b.b2 * 100 END, m.o2,
    m.r3, CASE WHEN COALESCE(b.b3,0)=0 THEN NULL ELSE m.r3 / b.b3 * 100 END, m.o3,
    m.r4, CASE WHEN COALESCE(b.b4,0)=0 THEN NULL ELSE m.r4 / b.b4 * 100 END, m.o4,
    m.r5, CASE WHEN COALESCE(b.b5,0)=0 THEN NULL ELSE m.r5 / b.b5 * 100 END, m.o5,
    m.r6, CASE WHEN COALESCE(b.b6,0)=0 THEN NULL ELSE m.r6 / b.b6 * 100 END, m.o6,
    m.r7, CASE WHEN COALESCE(b.b7,0)=0 THEN NULL ELSE m.r7 / b.b7 * 100 END, m.o7,
    m.r8, CASE WHEN COALESCE(b.b8,0)=0 THEN NULL ELSE m.r8 / b.b8 * 100 END, m.o8,
    m.r9, CASE WHEN COALESCE(b.b9,0)=0 THEN NULL ELSE m.r9 / b.b9 * 100 END, m.o9,
    m.r10, CASE WHEN COALESCE(b.b10,0)=0 THEN NULL ELSE m.r10 / b.b10 * 100 END, m.o10,
    m.r11, CASE WHEN COALESCE(b.b11,0)=0 THEN NULL ELSE m.r11 / b.b11 * 100 END, m.o11,
    m.r12, CASE WHEN COALESCE(b.b12,0)=0 THEN NULL ELSE m.r12 / b.b12 * 100 END, m.o12,
    (m.r1+m.r2+m.r3+m.r4+m.r5+m.r6+m.r7+m.r8+m.r9+m.r10+m.r11+m.r12) AS total_realizado,
    CASE WHEN COALESCE(b.b1+b.b2+b.b3+b.b4+b.b5+b.b6+b.b7+b.b8+b.b9+b.b10+b.b11+b.b12,0)=0
         THEN NULL
         ELSE (m.r1+m.r2+m.r3+m.r4+m.r5+m.r6+m.r7+m.r8+m.r9+m.r10+m.r11+m.r12)
              / (b.b1+b.b2+b.b3+b.b4+b.b5+b.b6+b.b7+b.b8+b.b9+b.b10+b.b11+b.b12) * 100
    END AS total_av,
    (m.o1+m.o2+m.o3+m.o4+m.o5+m.o6+m.o7+m.o8+m.o9+m.o10+m.o11+m.o12) AS total_orcado
  FROM meses m
  CROSS JOIN base b
  ORDER BY m.ordem;
END;
$function$;

NOTIFY pgrst, 'reload schema';