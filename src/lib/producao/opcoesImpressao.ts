export interface OpcaoEmpresa {
  cod_emp: string | number;
  nome_emp?: string;
  label?: string;
}

export interface OpcaoOrigem {
  cod_ori: string;
  descricao?: string;
  label?: string;
}

export interface OpcaoPedido {
  num_ped: string;
  label?: string;
}

export interface OpcaoRelatorioProducao {
  rel_prd: string;
  label?: string;
}

export interface OpcaoSituacao {
  sit_orp: string;
  descricao: string;
  label?: string;
}

export interface OpcaoOp {
  cod_emp?: string | number;
  cod_ori?: string;
  num_orp?: string | number;
  num_ped?: string;
  rel_prd?: string;
  produto?: string;
  cod_pro?: string;
  descricao_produto?: string;
  descricao?: string;
  des_pro?: string;
  quantidade?: number | string;
  qtde?: number | string;
  qtd_prevista?: number | string;
  unidade?: string;
  un?: string;
  unidade_medida?: string;
  situacao?: string;
  sit_orp?: string;
  situacao_descricao?: string;
  data_geracao?: string;
  inicio_previsto?: string;
  cod_cre?: string;
  descricao_centro_recurso?: string;
  label?: string;
  tem_observacao?: string;
  qtd_observacoes?: number | string;
}

export interface OpcaoEstagio {
  cod_etg: string;
  descricao?: string;
  label?: string;
}

export interface OpcaoCentroRecurso {
  cod_cre: string;
  descricao?: string;
  label?: string;
}

export interface OpcaoProduto {
  codigo: string;
  value: string;
  descricao?: string;
  label?: string;
  qtd_ops?: number;
}

export interface OpcoesImpressao {
  empresas?: OpcaoEmpresa[];
  origens?: OpcaoOrigem[];
  pedidos?: OpcaoPedido[];
  relatorios_producao?: OpcaoRelatorioProducao[];
  situacoes?: OpcaoSituacao[];
  ordens_producao?: OpcaoOp[];
  estagios?: OpcaoEstagio[];
  centros_recurso?: OpcaoCentroRecurso[];
  produtos?: OpcaoProduto[];
}

export interface OpcoesImpressaoParams {
  cod_emp?: string | number;
  cod_ori?: string;
  num_orp?: string | number;
  num_ped?: string;
  rel_prd?: string;
  sit_orp?: string;
  cod_etg?: string;
  cod_cre?: string;
  cod_pro?: string;
  q?: string;
  limite_ops?: number;
}
