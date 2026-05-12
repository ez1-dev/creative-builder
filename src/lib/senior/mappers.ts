import type {
  RegraLSP, Identificador, AuditoriaEntry, RegraVersao, SnapshotEntry,
  StatusRegra, SituacaoIdentificador, AmbienteRegra,
} from './types';

/** Normaliza linha vinda do backend (que pode usar nomes em UPPER do SQL Server). */
export const mapRegra = (r: any): RegraLSP => {
  const idRegra = r?.id_regra ?? r?.ID_REGRA ?? null;
  const origem = r?.origem ?? r?.ORIGEM ?? (idRegra == null ? 'E098REG' : 'PORTAL');
  const codemp = r?.codemp ?? r?.CODEMP ?? null;
  const modsis = r?.modsis ?? r?.MODSIS ?? null;
  const idereg = r?.idereg ?? r?.IDEREG ?? null;
  const codregErp = r?.codreg_erp ?? r?.CODREG_ERP ?? null;
  const id =
    r?.id ??
    idRegra ??
    `${origem ?? 'E098REG'}-${codemp ?? 0}-${modsis ?? ''}-${idereg ?? ''}-${codregErp ?? 0}`;
  return {
    id,
    id_regra: idRegra,
    codemp,
    origem,
    nome_regra: r?.nome_regra ?? r?.NOME_REGRA ?? '',
    codreg_erp: codregErp,
    modsis,
    idereg,
    codtns: r?.codtns ?? r?.CODTNS ?? null,
    descricao: r?.descricao ?? r?.DESCRICAO ?? null,
    ambiente: (r?.ambiente ?? r?.AMBIENTE ?? null) as AmbienteRegra | null,
    ticket: r?.ticket ?? r?.TICKET ?? null,
    motivo: r?.motivo ?? r?.MOTIVO ?? null,
    observacao: r?.observacao ?? r?.OBSREG ?? r?.OBSERVACAO ?? null,
    fonte_lsp: r?.fonte_lsp ?? r?.FONTE_LSP ?? null,
    status_regra: (r?.status_regra ?? r?.STATUS_REGRA) as StatusRegra,
    criado_por: r?.criado_por ?? r?.USUARIO_CRIACAO ?? null,
    criado_em: r?.criado_em ?? r?.DATA_CRIACAO ?? null,
    atualizado_em: r?.atualizado_em ?? r?.DATA_ATUALIZACAO ?? null,
  };
};

export const mapIdentificador = (r: any): Identificador => ({
  codemp: r?.codemp ?? r?.CODEMP,
  modsis: r?.modsis ?? r?.MODSIS ?? '',
  idereg: r?.idereg ?? r?.IDEREG ?? '',
  codtns: r?.codtns ?? r?.CODTNS ?? null,
  descricao: r?.descricao ?? r?.DESCRICAO ?? null,
  codreg: r?.codreg ?? r?.CODREG ?? null,
  situacao: (r?.situacao ?? r?.SITUACAO ?? 'A') as SituacaoIdentificador,
  observacao: r?.observacao ?? r?.OBSERVACAO ?? null,
  atualizado_em: r?.atualizado_em ?? r?.DATA_ATUALIZACAO ?? null,
});

export const mapAuditoria = (r: any): AuditoriaEntry => ({
  id: r?.id ?? r?.ID_AUDITORIA ?? r?.ID,
  data: r?.data ?? r?.DATA_HORA ?? r?.DATA ?? '',
  usuario: r?.usuario ?? r?.USUARIO ?? '',
  acao: r?.acao ?? r?.ACAO ?? '',
  alvo: r?.alvo ?? r?.ALVO,
  codemp: r?.codemp ?? r?.CODEMP ?? null,
  modsis: r?.modsis ?? r?.MODSIS ?? null,
  idereg: r?.idereg ?? r?.IDEREG ?? null,
  regra_anterior: r?.regra_anterior ?? r?.REGRA_ANTERIOR ?? null,
  regra_nova: r?.regra_nova ?? r?.REGRA_NOVA ?? null,
  situacao_anterior: (r?.situacao_anterior ?? r?.SITUACAO_ANTERIOR ?? null) as any,
  situacao_nova: (r?.situacao_nova ?? r?.SITUACAO_NOVA ?? null) as any,
  resultado: r?.resultado ?? r?.RESULTADO,
  detalhes: r?.detalhes ?? r?.DETALHES,
  motivo: r?.motivo ?? r?.MOTIVO ?? null,
});

export const mapVersao = (r: any): RegraVersao => ({
  id: r?.id ?? r?.ID_VERSAO ?? r?.ID,
  versao: r?.versao ?? r?.VERSAO,
  status_regra: (r?.status_regra ?? r?.STATUS_REGRA) as StatusRegra,
  criado_em: r?.criado_em ?? r?.DATA_CRIACAO ?? '',
  criado_por: r?.criado_por ?? r?.USUARIO_CRIACAO ?? null,
  motivo: r?.motivo ?? r?.MOTIVO ?? null,
});

export const mapSnapshot = (r: any): SnapshotEntry => ({
  id: r?.id ?? r?.ID_LOTE ?? r?.id_lote,
  data: r?.data ?? r?.DATA_HORA ?? r?.DATA ?? '',
  usuario: r?.usuario ?? r?.USUARIO ?? null,
  qtde_registros: r?.qtde_registros ?? r?.QTDE_REGISTROS ?? r?.total ?? 0,
  arquivo: r?.arquivo ?? r?.ARQUIVO ?? null,
});

/** Converte paginação interna { page, pageSize } → { pagina, tamanho_pagina } da API. */
export const toApiPaging = (f?: Record<string, any>) => {
  if (!f) return f;
  const { page, pageSize, ...rest } = f;
  if (page != null) rest.pagina = page;
  if (pageSize != null) rest.tamanho_pagina = pageSize;
  return rest;
};
