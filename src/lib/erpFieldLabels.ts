// Dicionário de campos do ERP Senior (rótulos amigáveis)
// Usado para exibir o "nome real" do campo ao lado do código técnico.

type FieldMap = Record<string, string>;

// Fallback global — campos comuns que aparecem em várias tabelas Senior
const GLOBAL: FieldMap = {
  NUMEMP: 'Número da Empresa',
  CODEMP: 'Código da Empresa',
  TIPCOL: 'Tipo de Colaborador',
  NUMCAD: 'Número do Cadastro',
  NOMFUN: 'Nome do Funcionário',
  NOMUSU: 'Nome do Usuário',
  CODUSU: 'Código do Usuário',
  SITCAD: 'Situação do Cadastro',
  EMPATI: 'Empresa de Atividade',
  FILATI: 'Filial de Atividade',
  PSTATI: 'Posto de Atividade',
  COOCCU: 'Código da Ocupação',
  SUPTME: 'Superior Imediato',
  INTNET: 'E-mail (Internet)',
  GERAUS: 'Gera Usuário (S/N)',
  FPGOBR: 'Forma de Pagamento Obrigatório',
  DATALT: 'Data da Alteração',
  USUALT: 'Usuário da Alteração',
  HORALT: 'Hora da Alteração',
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
  TIPLOG: 'Tipo de Logradouro',
  ENDRUA: 'Endereço',
  NUMEND: 'Número do Endereço',
  CPLEND: 'Complemento',
  BAIRES: 'Bairro',
  CIDRES: 'Cidade',
  ESTRES: 'UF',
  CEPRES: 'CEP',
  TELRES: 'Telefone',
  CARGO: 'Cargo',
  LOTACAO: 'Lotação',
};

// Mapas específicos por tabela (sobrepõem o GLOBAL quando houver)
const BY_TABLE: Record<string, FieldMap> = {
  E099USU: {
    // herda do GLOBAL; campos específicos podem ser adicionados aqui
  },
  R999USU: {
    NOMUSU: 'Nome do Usuário',
    CODUSU: 'Código do Usuário',
    SITCAD: 'Situação do Cadastro',
    SENHA: 'Senha',
  },
};

/**
 * Retorna o rótulo amigável de um campo do ERP.
 * Tenta primeiro o mapa específico da tabela, depois o fallback global.
 * Retorna "—" quando não houver mapeamento.
 */
export function getFieldLabel(tabela: string | null | undefined, campo: string | null | undefined): string {
  if (!campo) return '—';
  const tab = (tabela ?? '').toUpperCase();
  const key = campo.toUpperCase();
  const tabMap = BY_TABLE[tab];
  return tabMap?.[key] ?? GLOBAL[key] ?? '—';
}
