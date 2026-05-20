-- 1. Novos campos na tabela relatorios
ALTER TABLE public.relatorios
  ADD COLUMN IF NOT EXISTS tipo_fonte text NOT NULL DEFAULT 'sql',
  ADD COLUMN IF NOT EXISTS endpoint_url text,
  ADD COLUMN IF NOT EXISTS url_destino text;

ALTER TABLE public.relatorios
  DROP CONSTRAINT IF EXISTS relatorios_tipo_fonte_check;
ALTER TABLE public.relatorios
  ADD CONSTRAINT relatorios_tipo_fonte_check CHECK (tipo_fonte IN ('sql','api_rest'));

-- 2. Upsert do relatório RELAPROP
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.relatorios WHERE codigo = 'RELAPROP' LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.relatorios (
      codigo, nome, descricao, modulo, categoria, fonte_dados,
      sql_query, status, permite_excel, permite_pdf, permite_csv,
      tipo_fonte, endpoint_url, url_destino
    ) VALUES (
      'RELAPROP',
      'Impressão de Ordem de Produção',
      'Relatório customizado de impressão de OPs (cabeçalho + componentes + operações + desenhos). Consome o endpoint /api/producao/ordem-producao/impressao do FastAPI.',
      'Produção',
      'Operacional',
      'ERP Senior (FastAPI)',
      '',
      'publicado',
      false, false, false,
      'api_rest',
      '/api/producao/ordem-producao/impressao',
      '/producao/impressao-ordem-producao'
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.relatorios SET
      nome = 'Impressão de Ordem de Produção',
      descricao = 'Relatório customizado de impressão de OPs (cabeçalho + componentes + operações + desenhos). Consome o endpoint /api/producao/ordem-producao/impressao do FastAPI.',
      modulo = 'Produção',
      categoria = 'Operacional',
      fonte_dados = 'ERP Senior (FastAPI)',
      tipo_fonte = 'api_rest',
      endpoint_url = '/api/producao/ordem-producao/impressao',
      url_destino = '/producao/impressao-ordem-producao',
      status = 'publicado',
      permite_excel = false, permite_pdf = false, permite_csv = false,
      updated_at = now()
    WHERE id = v_id;
  END IF;

  -- Limpa parâmetros e colunas anteriores para reinserir limpos
  DELETE FROM public.relatorio_parametros WHERE relatorio_id = v_id;
  DELETE FROM public.relatorio_colunas WHERE relatorio_id = v_id;

  -- Parâmetros (espelho de ImpressaoOpFiltros)
  INSERT INTO public.relatorio_parametros (relatorio_id, nome, label, tipo, obrigatorio, valor_padrao, ordem, sql_lista) VALUES
    (v_id, 'cod_emp',              'Empresa',                  'numero',  true,  NULL, 0, NULL),
    (v_id, 'cod_ori',              'Origem',                   'texto',   true,  NULL, 1, NULL),
    (v_id, 'num_orp',              'Número da OP',             'numero',  true,  NULL, 2, NULL),
    (v_id, 'num_ped',              'Número do Pedido',         'texto',   false, NULL, 3, NULL),
    (v_id, 'rel_prd',              'Relacionamento Produto',   'texto',   false, NULL, 4, NULL),
    (v_id, 'sit_orp',              'Situação da OP',           'texto',   false, NULL, 5, NULL),
    (v_id, 'cod_pro',              'Código do Produto',        'texto',   false, NULL, 6, NULL),
    (v_id, 'listar_componentes',   'Listar componentes',       'lista',   false, 'S',  7, 'S|Sim'||chr(10)||'N|Não'),
    (v_id, 'listar_desenho',       'Listar desenho',           'lista',   false, 'N',  8, 'S|Sim'||chr(10)||'N|Não'),
    (v_id, 'cod_etg',              'Estágio',                  'texto',   false, NULL, 9, NULL),
    (v_id, 'cod_cre',              'Centro de Recurso',        'texto',   false, NULL, 10, NULL),
    (v_id, 'incluir_desenhos',     'Incluir desenhos (anexos)','lista',   false, 'N',  11, 'S|Sim'||chr(10)||'N|Não'),
    (v_id, 'quebrar_por_operacao', 'Quebrar por operação',     'lista',   false, 'N',  12, 'S|Sim'||chr(10)||'N|Não');

  -- Colunas: Cabeçalho
  INSERT INTO public.relatorio_colunas (relatorio_id, campo, titulo, visivel, ordem, tipo, alinhamento, totalizar, agrupar) VALUES
    (v_id, 'cabecalho.num_orp_formatado',  'Nº da OP',              true,  0,  'texto',  'esquerda', false, false),
    (v_id, 'cabecalho.produto',            'Código do Produto',     true,  1,  'texto',  'esquerda', false, false),
    (v_id, 'cabecalho.descricao_produto',  'Descrição do Produto',  true,  2,  'texto',  'esquerda', false, false),
    (v_id, 'cabecalho.unidade_medida',     'UN',                    true,  3,  'texto',  'centro',   false, false),
    (v_id, 'cabecalho.quantidade',         'Quantidade',            true,  4,  'numero', 'direita',  false, false),
    (v_id, 'cabecalho.pedido',             'Pedido',                true,  5,  'texto',  'esquerda', false, false),
    (v_id, 'cabecalho.inicio_previsto',    'Início Previsto',       true,  6,  'data',   'centro',   false, false),
    (v_id, 'cabecalho.periodo',            'Período',               true,  7,  'texto',  'esquerda', false, false),
    (v_id, 'cabecalho.situacao_descricao', 'Situação',              true,  8,  'texto',  'esquerda', false, false),
    (v_id, 'cabecalho.revisao',            'Revisão',               true,  9,  'texto',  'centro',   false, false),
    (v_id, 'cabecalho.codigo_barras_op',   'Código de Barras OP',   true,  10, 'texto',  'esquerda', false, false);

  -- Colunas: Componentes
  INSERT INTO public.relatorio_colunas (relatorio_id, campo, titulo, visivel, ordem, tipo, alinhamento, totalizar, agrupar) VALUES
    (v_id, 'componentes.codigo_componente',         'Código',              true, 100, 'texto',  'esquerda', false, false),
    (v_id, 'componentes.descricao_componente',      'Descrição',           true, 101, 'texto',  'esquerda', false, false),
    (v_id, 'componentes.quantidade_prevista',       'Qtde. Prevista',      true, 102, 'numero', 'centro',   false, false),
    (v_id, 'componentes.unidade_medida',            'UN',                  true, 103, 'texto',  'centro',   false, false),
    (v_id, 'componentes.deposito',                  'Depósito',            true, 104, 'texto',  'esquerda', false, false),
    (v_id, 'componentes.endereco',                  'Endereço',            true, 105, 'texto',  'esquerda', false, false),
    (v_id, 'componentes.cod_etg',                   'Estágio',             true, 106, 'texto',  'esquerda', false, false),
    (v_id, 'componentes.seq_cmp',                   'Seq.',                true, 107, 'numero', 'centro',   false, false),
    (v_id, 'componentes.codigo_barras_componente',  'Código de Barras',    true, 108, 'texto',  'esquerda', false, false);

  -- Colunas: Operações
  INSERT INTO public.relatorio_colunas (relatorio_id, campo, titulo, visivel, ordem, tipo, alinhamento, totalizar, agrupar) VALUES
    (v_id, 'operacoes.cod_etg',                    'Estágio',              true, 200, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.descricao_estagio',          'Descrição Estágio',    true, 201, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.seq_rot',                    'Seq. Roteiro',         true, 202, 'numero', 'centro',   false, false),
    (v_id, 'operacoes.cod_cre',                    'Centro Recurso',       true, 203, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.descricao_centro_recurso',   'Descrição CR',         true, 204, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.cod_opr',                    'Operação',             true, 205, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.descricao_operacao',         'Descrição Operação',   true, 206, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.fornecedor',                 'Fornecedor',           true, 207, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.servico',                    'Serviço',              true, 208, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.descricao_servico',          'Descrição Serviço',    true, 209, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.tmp_unit',                   'Tempo Unit.',          true, 210, 'numero', 'direita',  false, false),
    (v_id, 'operacoes.tmp_total',                  'Tempo Total',          true, 211, 'numero', 'direita',  false, false),
    (v_id, 'operacoes.unidade_medida',             'UN',                   true, 212, 'texto',  'centro',   false, false),
    (v_id, 'operacoes.proxima_operacao_label',     'Próxima Operação',     true, 213, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.codigo_barras_operacao',     'Código de Barras Op.', true, 214, 'texto',  'esquerda', false, false),
    (v_id, 'operacoes.narrativas',                 'Narrativas',           true, 215, 'texto',  'esquerda', false, false);

  -- Layout
  INSERT INTO public.relatorio_layout (relatorio_id, tipo, titulo, subtitulo, mostrar_filtros, mostrar_totais, mostrar_data_hora, mostrar_usuario, config)
  VALUES (v_id, 'tabela_simples', 'Impressão de Ordem de Produção', 'Cabeçalho + componentes + operações + desenhos da OP', true, false, true, true, '{}'::jsonb)
  ON CONFLICT (relatorio_id) DO UPDATE SET
    tipo = EXCLUDED.tipo,
    titulo = EXCLUDED.titulo,
    subtitulo = EXCLUDED.subtitulo,
    mostrar_filtros = EXCLUDED.mostrar_filtros,
    mostrar_totais = EXCLUDED.mostrar_totais,
    mostrar_data_hora = EXCLUDED.mostrar_data_hora,
    mostrar_usuario = EXCLUDED.mostrar_usuario,
    updated_at = now();
END $$;