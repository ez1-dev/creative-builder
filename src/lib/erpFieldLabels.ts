// Dicionário de campos do ERP Senior (rótulos amigáveis)
// Usado para exibir o "nome real" do campo ao lado do código técnico
// nas telas de SGU › Preview por campo, Comparar usuários, etc.

type FieldMap = Record<string, string>;

// Fallback global — campos comuns que aparecem em várias tabelas Senior (E099*, R910, R999, etc.)
const GLOBAL: FieldMap = {
  // Identificação de usuário
  CODUSU: 'Código do Usuário',
  NOMUSU: 'Nome do Usuário',
  DESUSU: 'Descrição do Usuário',
  NOMCOM: 'Nome Completo',
  TIPUSU: 'Tipo de Usuário',
  BLOUSU: 'Usuário Bloqueado',
  SENHA: 'Senha',
  OBSUSU: 'Observação do Usuário',
  IDEEXT: 'Identificador Externo',

  // Empresa / Filial / Estrutura
  NUMEMP: 'Número da Empresa',
  CODEMP: 'Código da Empresa',
  NUMFIL: 'Número da Filial',
  CODFIL: 'Código da Filial',
  EMPATI: 'Empresa de Atividade',
  FILATI: 'Filial de Atividade',
  PSTATI: 'Posto de Atividade',
  EMPCOL: 'Empresa do Colaborador',
  FILCOL: 'Filial do Colaborador',

  // Colaborador / cadastro
  TIPCOL: 'Tipo de Colaborador',
  NUMCAD: 'Número do Cadastro',
  NOMFUN: 'Nome do Funcionário',
  SITCAD: 'Situação do Cadastro',
  COOCCU: 'Código da Ocupação',
  SUPTME: 'Superior Imediato',
  CARGO: 'Cargo',
  LOTACAO: 'Lotação',

  // Permissão / acesso
  INDPER: 'Indicador de Permissão',
  NIVPER: 'Nível de Permissão',
  INDACE: 'Indicador de Acesso',
  INDPAD: 'Indicador Padrão',
  INDATI: 'Indicador Ativo',
  INDBLO: 'Indicador de Bloqueio',
  INDEXC: 'Indicador de Exclusão',
  INDINC: 'Indicador de Inclusão',
  INDALT: 'Indicador de Alteração',
  INDCON: 'Indicador de Consulta',

  // Datas / auditoria
  DATINI: 'Data Inicial',
  DATFIM: 'Data Final',
  DATALT: 'Data da Alteração',
  HORALT: 'Hora da Alteração',
  USUALT: 'Usuário da Alteração',
  DATCAD: 'Data de Cadastro',
  DATEXC: 'Data de Exclusão',

  // Financeiro
  CODFPG: 'Forma de Pagamento',
  FPGOBR: 'Forma de Pagamento Obrigatória',
  CODTPT: 'Tipo de Título',
  CODNAT: 'Natureza',
  CODCCU: 'Código do Centro de Custo',
  CODPRJ: 'Código do Projeto',
  CODFOR: 'Código do Fornecedor',
  CODCLI: 'Código do Cliente',
  CODCFO: 'Cliente / Fornecedor',
  CODESP: 'Espécie',
  CODBAN: 'Banco',
  CODCCO: 'Conta Corrente',
  CODFCO: 'Filial da Conta',
  CODAGE: 'Agência',
  CODMOE: 'Moeda',

  // Estrutura organizacional
  CODGRP: 'Grupo',
  CODDEP: 'Departamento',
  CODSEC: 'Seção',
  CODVEN: 'Vendedor',
  CODCPR: 'Comprador',
  CODREP: 'Representante',
  CODTRA: 'Transportadora',
  CODOPR: 'Operador',
  CODORI: 'Origem',

  // Dados pessoais
  ESTCIV: 'Estado Civil',
  GRAINS: 'Grau de Instrução',
  NACFUN: 'Nacionalidade',
  SEXFUN: 'Sexo',
  CORRAC: 'Cor / Raça',
  DATNAS: 'Data de Nascimento',
  NUMCPF: 'CPF',
  NUMRGE: 'RG',
  NUMPIS: 'PIS / PASEP',
  CARTRA: 'Carteira de Trabalho',

  // Endereço / contato
  TIPLOG: 'Tipo de Logradouro',
  ENDRUA: 'Endereço',
  NUMEND: 'Número do Endereço',
  CPLEND: 'Complemento',
  BAIRES: 'Bairro',
  CIDRES: 'Cidade',
  ESTRES: 'UF',
  CEPRES: 'CEP',
  TELRES: 'Telefone Residencial',
  TELCEL: 'Celular',
  INTNET: 'E-mail (Internet)',
  GERAUS: 'Gera Usuário (S/N)',
};

// Mapas específicos por tabela (sobrepõem o GLOBAL quando houver)
const BY_TABLE: Record<string, FieldMap> = {
  // ===== R910 / R999 — Cadastro base de usuários =====
  R910USU: {},
  R999USU: {
    NOMUSU: 'Nome do Usuário',
    CODUSU: 'Código do Usuário',
    SITCAD: 'Situação do Cadastro',
    SENHA: 'Senha',
    BLOUSU: 'Usuário Bloqueado',
  },

  // ===== E099USU — Parâmetros gerais do usuário SGU =====
  E099USU: {
    CODUSU: 'Código do Usuário',
    NUMEMP: 'Número da Empresa',
    TIPUSU: 'Tipo de Usuário',
    INDPAD: 'Empresa Padrão',
    INDACE: 'Indicador de Acesso',
    NIVACE: 'Nível de Acesso',
  },

  // ===== E099CPR — Compradores autorizados =====
  E099CPR: {
    CODUSU: 'Código do Usuário',
    NUMEMP: 'Número da Empresa',
    CODCPR: 'Comprador Autorizado',
    INDPAD: 'Comprador Padrão',
  },

  // ===== E099FIN — Restrições financeiras =====
  E099FIN: {
    CODUSU: 'Código do Usuário',
    NUMEMP: 'Número da Empresa',
    CODFPG: 'Forma de Pagamento',
    CODTPT: 'Tipo de Título',
    CODNAT: 'Natureza Financeira',
    CODCCU: 'Centro de Custo',
    CODPRJ: 'Projeto',
    CODESP: 'Espécie',
    INDACE: 'Indicador de Acesso',
  },

  // ===== E099GCO — Grupos de contas =====
  E099GCO: {
    CODUSU: 'Código do Usuário',
    NUMEMP: 'Número da Empresa',
    CODGRP: 'Código do Grupo',
    CODCCU: 'Centro de Custo',
    INDACE: 'Indicador de Acesso',
  },

  // ===== E099UCP — Usuário × Centro de Custo / Projeto =====
  E099UCP: {
    CODUSU: 'Código do Usuário',
    NUMEMP: 'Número da Empresa',
    CODCCU: 'Centro de Custo',
    CODPRJ: 'Projeto',
    INDACE: 'Indicador de Acesso',
    INDPAD: 'Centro de Custo Padrão',
  },

  // ===== E099UDE — Usuário × Departamento =====
  E099UDE: {
    CODUSU: 'Código do Usuário',
    NUMEMP: 'Número da Empresa',
    CODDEP: 'Departamento',
    CODSEC: 'Seção',
    INDACE: 'Indicador de Acesso',
  },

  // ===== E099USE — Usuário × Seção / Empresa =====
  E099USE: {
    CODUSU: 'Código do Usuário',
    NUMEMP: 'Número da Empresa',
    NUMFIL: 'Número da Filial',
    CODSEC: 'Seção',
    INDACE: 'Indicador de Acesso',
  },

  // ===== E099UVE — Usuário × Vendedor =====
  E099UVE: {
    CODUSU: 'Código do Usuário',
    NUMEMP: 'Número da Empresa',
    CODVEN: 'Vendedor Autorizado',
    INDPAD: 'Vendedor Padrão',
  },
};

/**
 * Retorna o rótulo amigável de um campo do ERP.
 * Tenta primeiro o mapa específico da tabela, depois o fallback global.
 * Se não houver mapeamento, retorna o próprio código no formato `(TABELA.CAMPO)`
 * para que campos não mapeados fiquem visíveis e possam ser reportados.
 */
export function getFieldLabel(
  tabela: string | null | undefined,
  campo: string | null | undefined,
): string {
  if (!campo) return '—';
  const tab = (tabela ?? '').toUpperCase();
  const key = campo.toUpperCase();
  const tabMap = BY_TABLE[tab];
  return tabMap?.[key] ?? GLOBAL[key] ?? `(${tab || '?'}.${key})`;
}
