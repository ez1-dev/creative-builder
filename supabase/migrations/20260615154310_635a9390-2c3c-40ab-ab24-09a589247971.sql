ALTER TABLE public.etl_acoes
  ADD COLUMN IF NOT EXISTS coluna_periodo text,
  ADD COLUMN IF NOT EXISTS tentativas smallint NOT NULL DEFAULT 1;

INSERT INTO public.etl_tarefas (grupo, nome_tarefa, descricao, ativa, ordem)
VALUES ('CONTABILIDADE', 'ATU_CONTABILIDADE', 'Atualização BI Contabilidade', true, 20)
ON CONFLICT (nome_tarefa) DO NOTHING;

WITH t AS (SELECT id FROM public.etl_tarefas WHERE nome_tarefa='ATU_CONTABILIDADE')
INSERT INTO public.etl_acoes
  (tarefa_id, ordem, id_acao, nome_acao, tipo_execucao, tipo_comando,
   tabela_destino, coluna_periodo, estrategia_carga, caso_erro, tentativas)
VALUES
  ((SELECT id FROM t), 1,  'VM_ORC_DRE',                'Orçamento DRE',
     'API','SQL', 'bi_vm_orc_dre',                'anomes_referente', 'REPLACE_PERIODO','PARAR',1),
  ((SELECT id FROM t), 2,  'VM_LANC_CONTABIL',          'Lançamentos contábeis',
     'API','SQL', 'bi_vm_lanc_contabil',          'anomes_referente', 'REPLACE_PERIODO','PARAR',1),
  ((SELECT id FROM t), 3,  'ETL_V_BALANCO_PATRIMONIAL', 'Balanço patrimonial',
     'API','SQL', 'bi_etl_v_balanco_patrimonial', 'anomes_referente', 'REPLACE_PERIODO','PARAR',1),
  ((SELECT id FROM t), 99, 'ATU_CONTABILIDADE',         'Finalização contabilidade',
     'API','FUNCAO', NULL, NULL, 'REPLACE_PERIODO','CONTINUAR',1)
ON CONFLICT DO NOTHING;