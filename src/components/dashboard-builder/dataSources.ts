import type { DataSourceField } from './types';

export const PASSAGENS_FIELDS: DataSourceField[] = [
  { key: 'data_registro', label: 'Data Registro', kind: 'date' },
  { key: 'colaborador', label: 'Colaborador', kind: 'text' },
  { key: 'centro_custo', label: 'Centro de Custo', kind: 'text' },
  { key: 'projeto_obra', label: 'Projeto / Obra', kind: 'text' },
  { key: 'fornecedor', label: 'Fornecedor', kind: 'text' },
  { key: 'cia_aerea', label: 'Cia Aérea', kind: 'text' },
  { key: 'origem', label: 'Origem', kind: 'text' },
  { key: 'destino', label: 'Destino', kind: 'text' },
  { key: 'tipo_despesa', label: 'Tipo de Despesa', kind: 'text' },
  { key: 'motivo_viagem', label: 'Motivo Viagem', kind: 'text' },
  { key: 'data_ida', label: 'Data Ida', kind: 'date' },
  { key: 'data_volta', label: 'Data Volta', kind: 'date' },
  { key: 'valor', label: 'Valor', kind: 'number' },
];
