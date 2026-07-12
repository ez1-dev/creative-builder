/**
 * Catálogo declarativo de campos sensíveis por origem de dados.
 * Usado por applyMask para transformar objetos/arrays antes de renderizar.
 *
 * Regras:
 * - names: campos que carregam nomes → maskName(kind, v)
 * - docs:  campos que carregam documentos → maskDoc(kind, v)
 * - money: campos numéricos monetários → maskCurrency(v)
 * - text:  strings livres → applyText(v) (aplica text_replacements)
 *
 * Chaves declaradas aqui cobrem tanto snake_case (do backend) quanto camelCase.
 */
import type { MaskDocKind, MaskNameKind } from '@/contexts/DemoModeContext';

export interface FieldSpec {
  names?: Partial<Record<string, MaskNameKind>>;
  docs?: Partial<Record<string, MaskDocKind>>;
  money?: string[];
  text?: string[];
}

/** Especificações por "schemaKey" — use o nome curto do módulo. */
export const MASKING_SCHEMAS: Record<string, FieldSpec> = {
  comercial: {
    names: {
      cliente: 'cliente', ds_cliente: 'cliente', nm_cliente: 'cliente', nome_cliente: 'cliente',
      revenda: 'revenda', ds_revenda: 'revenda', nm_revenda: 'revenda', nome_revenda: 'revenda',
      produto: 'cliente', ds_produto: 'cliente', nm_produto: 'cliente',
      projeto: 'cliente', ds_projeto: 'cliente', obra: 'cliente',
      vendedor: 'colaborador', ds_vendedor: 'colaborador',
    },
    docs: { cnpj: 'cnpj', cpf: 'cpf', cnpj_cpf: 'cnpj', nr_nota: 'nota', numero_nota: 'nota', nota_fiscal: 'nota' },
    money: ['vl_total', 'vl_liquido', 'vl_bruto', 'vl_faturado', 'vl_recebido', 'vl_meta', 'valor', 'valor_total', 'valor_liquido', 'total', 'ticket_medio'],
  },
  frota: {
    names: {
      motorista: 'motorista', ds_motorista: 'motorista',
      fornecedor: 'fornecedor', ds_fornecedor: 'fornecedor',
      veiculo_descricao: 'cliente', descricao: 'cliente',
    },
    docs: { placa: 'placa', cnpj: 'cnpj', cpf: 'cpf', nota_fiscal: 'nota' },
    money: ['valor', 'valor_total', 'total', 'vl_total'],
  },
  maquinas: {
    names: {
      maquina: 'cliente', tipo_maquina: 'cliente',
      fornecedor: 'fornecedor', ds_fornecedor: 'fornecedor',
      descricao: 'cliente',
    },
    docs: { cnpj: 'cnpj', nota_fiscal: 'nota' },
    money: ['valor', 'valor_total', 'total'],
  },
  passagens: {
    names: {
      colaborador: 'colaborador', ds_colaborador: 'colaborador', nome: 'colaborador',
      cidade_origem: 'cliente', cidade_destino: 'cliente', destino: 'cliente', origem: 'cliente',
      motivo_viagem: 'cliente',
    },
    docs: { cpf: 'cpf', cnpj: 'cnpj' },
    money: ['valor', 'valor_total', 'valor_passagem', 'total'],
  },
  financeiro: {
    names: {
      fornecedor: 'fornecedor', ds_fornecedor: 'fornecedor',
      cliente: 'cliente', ds_cliente: 'cliente',
      descricao: 'cliente', historico: 'cliente',
    },
    docs: { cnpj: 'cnpj', cpf: 'cpf' },
    money: ['vl_saldo', 'vl_debito', 'vl_credito', 'vl_orcado', 'vl_realizado', 'valor'],
  },
  compras: {
    names: {
      fornecedor: 'fornecedor', ds_fornecedor: 'fornecedor',
      produto: 'cliente', ds_produto: 'cliente',
    },
    docs: { cnpj: 'cnpj', nota_fiscal: 'nota' },
    money: ['vl_total', 'vl_liquido', 'vl_bruto', 'valor', 'total'],
  },
  producao: {
    names: {
      cliente: 'cliente', produto: 'cliente', op: 'cliente', ds_op: 'cliente',
      centro_custo: 'cliente', recurso: 'cliente',
    },
    money: ['valor', 'vl_total'],
  },
  colaboradores: {
    names: { nome: 'colaborador', nome_colaborador: 'colaborador' },
    docs: { cpf: 'cpf', matricula: 'cpf' },
  },
};

export type SchemaKey = keyof typeof MASKING_SCHEMAS;
