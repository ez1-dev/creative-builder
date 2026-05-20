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

export interface OpcaoOp {
  cod_emp?: string | number;
  cod_ori?: string;
  num_orp?: string | number;
  produto?: string;
  descricao_produto?: string;
  label?: string;
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

export interface OpcoesImpressao {
  empresas?: OpcaoEmpresa[];
  origens?: OpcaoOrigem[];
  ordens_producao?: OpcaoOp[];
  estagios?: OpcaoEstagio[];
  centros_recurso?: OpcaoCentroRecurso[];
}

export interface OpcoesImpressaoParams {
  cod_emp?: string | number;
  cod_ori?: string;
  num_orp?: string | number;
  cod_etg?: string;
  cod_cre?: string;
  q?: string;
  limite_ops?: number;
}
