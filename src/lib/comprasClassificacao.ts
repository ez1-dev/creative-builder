// Classificação provisória de Projeto Macro e Tipo de Despesa para o Painel de Compras.
// Quando a API retornar `projeto_macro` / `tipo_despesa` diretamente, esses valores são respeitados.

export type ProjetoMacro = 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'OUTROS';
export type TipoDespesa = 'Matéria-prima' | 'Uso e consumo' | 'Despesas gerais' | 'Serviços';

const RAW_MATERIAL_HINTS = ['MAT', 'MATERIA', 'MATÉRIA', 'PRIMA', 'INSUMO', 'ACO', 'AÇO', 'METAL', 'CHAPA', 'PERFIL', 'TUBO', 'BARRA'];
const USO_CONSUMO_HINTS = ['EPI', 'FERRAMENTA', 'BROCA', 'DISCO', 'LIXA', 'MANUTEN', 'CONSUMO', 'LUVA', 'CAPACETE'];

// Códigos de origem do material classificados como GENIUS no ERP.
const GENIUS_ORIGENS = new Set([
  '110','120','130','135','140','150',
  '205','208','210','220','230','235','240','245','250',
]);

function up(v: any): string {
  return String(v ?? '').toUpperCase();
}

function parseNumeroProjeto(v: any): number | null {
  if (v == null) return null;
  const m = String(v).match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

export function getProjetoMacro(row: any): ProjetoMacro {
  // Aceita valor já vindo do backend, mas normaliza nomenclaturas antigas.
  const fromApi = row?.projeto_macro;
  if (fromApi) {
    const upApi = up(fromApi);
    if (upApi === 'GENIUS') return 'GENIUS';
    if (upApi === 'ESTRUTURAL ZORTEA' || upApi === 'ESTRUTURAL') return 'ESTRUTURAL ZORTEA';
    if (upApi === 'OUTROS') return 'OUTROS';
  }

  // 1) Número do projeto >= 600 (faixa 6xx em diante) → ESTRUTURAL ZORTEA
  const numero = parseNumeroProjeto(row?.numero_projeto ?? row?.codigo_projeto ?? row?.projeto);
  if (numero != null && numero >= 600) return 'ESTRUTURAL ZORTEA';

  // 2) Origem do material indica GENIUS
  const origem = String(row?.origem_material ?? row?.codigo_origem ?? row?.origem ?? '').trim();
  if (origem && GENIUS_ORIGENS.has(origem)) return 'GENIUS';

  // 3) Nome do projeto contém GENIUS/GENI
  const nome = up(row?.nome_projeto || row?.descricao_projeto || row?.projeto);
  if (nome.includes('GENIUS') || nome.includes('GENI')) return 'GENIUS';

  // 4) Nome do projeto contém ESTRUTURAL/ZORTEA
  if (nome.includes('ESTRUTURAL') || nome.includes('ZORTEA')) return 'ESTRUTURAL ZORTEA';

  return 'OUTROS';
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
  const v = row?.mes_competencia || row?.data_emissao || row?.data_recebimento;
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
