// Classificação provisória de Projeto Macro e Tipo de Despesa para o Painel de Compras.
// Quando a API retornar `projeto_macro` / `tipo_despesa` diretamente, esses valores são respeitados.

export type ProjetoMacro = 'Genius' | 'Estrutural' | 'Outros';
export type TipoDespesa = 'Matéria-prima' | 'Uso e consumo' | 'Despesas gerais' | 'Serviços';

const RAW_MATERIAL_HINTS = ['MAT', 'MATERIA', 'MATÉRIA', 'PRIMA', 'INSUMO', 'ACO', 'AÇO', 'METAL', 'CHAPA', 'PERFIL', 'TUBO', 'BARRA'];
const USO_CONSUMO_HINTS = ['EPI', 'FERRAMENTA', 'BROCA', 'DISCO', 'LIXA', 'MANUTEN', 'CONSUMO', 'LUVA', 'CAPACETE'];

function up(v: any): string {
  return String(v ?? '').toUpperCase();
}

export function getProjetoMacro(row: any): ProjetoMacro {
  const fromApi = row?.projeto_macro;
  if (fromApi && ['Genius', 'Estrutural', 'Outros'].includes(fromApi)) return fromApi as ProjetoMacro;
  const nome = up(row?.nome_projeto || row?.descricao_projeto || row?.projeto || row?.numero_projeto);
  if (nome.includes('GENIUS') || nome.includes('GENI')) return 'Genius';
  if (nome.includes('ESTRUT')) return 'Estrutural';
  return 'Outros';
}

export function getTipoDespesa(row: any): TipoDespesa {
  const fromApi = row?.tipo_despesa;
  if (fromApi && ['Matéria-prima', 'Uso e consumo', 'Despesas gerais', 'Serviços'].includes(fromApi)) {
    return fromApi as TipoDespesa;
  }
  const tipoItem = up(row?.tipo_item);
  if (tipoItem === 'SERVICO' || tipoItem === 'SERVIÇO' || tipoItem === 'S') return 'Serviços';

  const desc = up(row?.descricao_item);
  if (USO_CONSUMO_HINTS.some((h) => desc.includes(h))) return 'Uso e consumo';

  const origem = up(row?.origem_material);
  const familia = up(row?.codigo_familia);
  if (RAW_MATERIAL_HINTS.some((h) => origem.includes(h) || familia.includes(h) || desc.includes(h))) {
    return 'Matéria-prima';
  }
  return 'Despesas gerais';
}

export function getMesCompetencia(row: any): string {
  const v = row?.mes_competencia || row?.data_emissao;
  if (!v) return '';
  return String(v).substring(0, 7); // YYYY-MM
}

export function enrichRow<T extends Record<string, any>>(row: T) {
  return {
    ...row,
    projeto_macro: getProjetoMacro(row),
    tipo_despesa_calc: getTipoDespesa(row),
    mes_competencia_calc: getMesCompetencia(row),
  };
}
