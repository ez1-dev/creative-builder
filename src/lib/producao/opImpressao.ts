export interface OpCabecalho {
  cod_emp?: string | number;
  cod_ori?: string;
  num_orp?: string | number;
  num_orp_formatado?: string;
  codigo_barras_op?: string;
  produto?: string;
  descricao?: string;
  descricao_produto?: string;
  produto_descricao?: string;
  unidade_medida?: string;
  quantidade?: number | string;
  pedido?: string;
  inicio_previsto?: string;
  periodo?: string;
  situacao?: string;
  situacao_descricao?: string;
  agrupamento?: string;
  revisao?: string;
  derivacao?: string;
}

export interface OpComponente {
  codigo_componente?: string;
  descricao_componente?: string;
  quantidade_prevista?: number | string;
  unidade_medida?: string;
  deposito?: string;
  endereco?: string;
  cod_etg?: string;
  seq_cmp?: string | number;
  codigo_barras_componente?: string;
}

export interface OpOperacao {
  cod_etg?: string;
  descricao_estagio?: string;
  seq_rot?: string | number;
  cod_cre?: string;
  descricao_centro_recurso?: string;
  cod_opr?: string;
  descricao_operacao?: string;
  fornecedor?: string;
  servico?: string;
  descricao_servico?: string;
  tmp_unit?: number | string;
  tmp_total?: number | string;
  tmp_unit_formatado?: string;
  tmp_total_formatado?: string;
  unidade_medida?: string;
  codigo_barras_operacao?: string;
  proxima_operacao?: string;
  proxima_operacao_codigo?: string;
  proxima_operacao_descricao?: string;
  proxima_operacao_label?: string;
  narrativas?: string;
}

export interface OpDesenho {
  ordem?: number | string;
  nome_arquivo?: string;
  tipo?: string;
  extensao?: string;
  mime_type?: string;
  url?: string;
  url_impressao?: string;
  url_manifest_a4?: string;
  cache_key?: string;
  usar_paginas_a4_normalizadas?: boolean;
  layout_impressao?: 'A4_RETRATO' | 'A4_RETRATO_NORMALIZADO' | string;
  rotacao_automatica?: boolean;
  largura?: number;
  altura?: number;
  orientacao?: string;
  rotacao_recomendada?: number;
  rotacionar_para_retrato?: boolean;
}




export interface OpImpressao {
  cabecalho?: OpCabecalho;
  componentes?: OpComponente[];
  operacoes?: OpOperacao[];
  observacoes?: string[];
  mensagem_responsabilidade?: string;
  desenhos?: OpDesenho[];
  layout_componentes?: {
    quebrar_componentes_em_pagina_separada?: boolean;
    limite_componentes_primeira_pagina?: number;
    posicao_componentes_quando_quebrar?: 'APOS_OPERACOES' | 'ANTES_OPERACOES';
  };
  modo_impressao?: {
    imprimir_observacoes?: boolean;
    quebrar_por_operacao?: boolean;
    desenhos_apos_op?: boolean;
    desenhos_um_por_pagina?: boolean;
    a4?: boolean;
  };
}

export interface ImpressaoOpFiltros {
  cod_emp?: string;
  cod_ori?: string;
  num_orp?: string;
  num_ped?: string;
  rel_prd?: string;
  sit_orp?: string;
  cod_pro?: string;
  listar_componentes?: 'S' | 'N' | '';
  listar_desenho?: 'S' | 'N' | '';
  cod_etg?: string;
  cod_cre?: string;
  incluir_desenhos?: 'S' | 'N' | '';
  quebrar_por_operacao?: 'S' | 'N' | '';
}

