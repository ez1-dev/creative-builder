export interface OpCabecalho {
  cod_emp?: string | number;
  cod_ori?: string;
  num_orp?: string | number;
  num_orp_formatado?: string;
  codigo_barras_op?: string;
  produto?: string;
  descricao_produto?: string;
  produto_descricao?: string;
  unidade_medida?: string;
  quantidade?: number | string;
  pedido?: string;
  inicio_previsto?: string;
  periodo?: string;
  situacao?: string;
  agrupamento?: string;
  revisao?: string;
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
  tmp_unit?: number | string;
  tmp_total?: number | string;
  unidade_medida?: string;
  codigo_barras_operacao?: string;
  proxima_operacao?: string;
  narrativas?: string;
}

export interface OpImpressao {
  cabecalho?: OpCabecalho;
  componentes?: OpComponente[];
  operacoes?: OpOperacao[];
  observacoes?: string[];
  mensagem_responsabilidade?: string;
}

export interface ImpressaoOpFiltros {
  cod_emp?: string;
  cod_ori?: string;
  num_orp?: string;
  sit_orp?: string;
  data_geracao?: string;
  agrupamento?: string;
  listar_componentes?: 'S' | 'N' | '';
  listar_desenho?: 'S' | 'N' | '';
  pasta_desenhos?: string;
  cod_etg?: string;
  etg_cor?: string;
  cod_cre?: string;
}
