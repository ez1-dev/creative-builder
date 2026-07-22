// Catálogo central de funcionalidades liberáveis por perfil/usuário.
// Adicionar/remover é edição deste arquivo — não requer migration.

export type FeatureArea = 'funcionalidade' | 'integracao' | 'visual_demo';

export interface FeatureDef {
  key: string;
  label: string;
  area: FeatureArea;
  group: string;          // Ex.: 'DRE', 'Requisições', 'Integrações'
  description?: string;
  default: boolean;       // Valor quando nenhum perfil/usuário definiu
}

export const FEATURE_CATALOG: FeatureDef[] = [
  // ============================================================
  // Funcionalidades dentro de telas
  // ============================================================
  { key: 'dre.exportar_xlsx',        area: 'funcionalidade', group: 'DRE / Contabilidade', label: 'Exportar DRE para Excel',        default: true },
  { key: 'dre.drill_razao',          area: 'funcionalidade', group: 'DRE / Contabilidade', label: 'Abrir drill do Razão Contábil',  default: true },
  { key: 'dre.configurar_modelo',    area: 'funcionalidade', group: 'DRE / Contabilidade', label: 'Configurar modelos da DRE',      default: true },
  { key: 'balanco.exportar_xlsx',    area: 'funcionalidade', group: 'DRE / Contabilidade', label: 'Exportar Balanço para Excel',    default: true },

  { key: 'requisicoes.aprovar',      area: 'funcionalidade', group: 'Requisições',         label: 'Aprovar requisições',            default: true },
  { key: 'requisicoes.sid_enviar',   area: 'funcionalidade', group: 'Requisições',         label: 'Enviar requisição ao ERP (SID)', default: true },

  { key: 'sgu.aplicar_duplicacao',   area: 'funcionalidade', group: 'SGU',                 label: 'Aplicar duplicação SGU',         default: true },

  { key: 'bi.criar_widget',          area: 'funcionalidade', group: 'BI / Dashboards',     label: 'Criar/editar widgets no BI',     default: true },
  { key: 'bi.exportar_dashboard',    area: 'funcionalidade', group: 'BI / Dashboards',     label: 'Exportar dashboard',             default: true },

  { key: 'relatorios.publicar',      area: 'funcionalidade', group: 'Relatórios',          label: 'Publicar relatório',             default: true },

  // ============================================================
  // Integrações
  // ============================================================
  { key: 'integracao.sid',           area: 'integracao', group: 'ERP Senior',        label: 'Integração SID (envio ao ERP)',       description: 'Envio de requisições/movimentos via SID Web Services.',   default: true },
  { key: 'integracao.etl',           area: 'integracao', group: 'Camada Analítica',  label: 'ETL / Camada BI',                     description: 'Disparo manual de rotinas ETL.',                            default: true },
  { key: 'integracao.ia_gateway',    area: 'integracao', group: 'IA',                label: 'Lovable AI Gateway',                  description: 'Uso de assistentes e sugestões via IA.',                   default: true },
  { key: 'integracao.ia_relatorios', area: 'integracao', group: 'IA',                label: 'Relatórios com IA (PDF)',             description: 'Geração de resumos executivos por IA.',                    default: true },

  // ============================================================
  // Visual & Demo
  // ============================================================
  { key: 'visual.tema_escuro',       area: 'visual_demo', group: 'Visual',    label: 'Permitir tema escuro',                default: true },
  { key: 'demo.mascaramento',        area: 'visual_demo', group: 'Demo',      label: 'Mascaramento de dados sensíveis',     default: false },
  { key: 'demo.modo_apresentacao',   area: 'visual_demo', group: 'Demo',      label: 'Modo apresentação/demonstração',      default: false },
];

export const FEATURES_BY_KEY: Record<string, FeatureDef> =
  Object.fromEntries(FEATURE_CATALOG.map((f) => [f.key, f]));

export function featuresByArea(area: FeatureArea): FeatureDef[] {
  return FEATURE_CATALOG.filter((f) => f.area === area);
}

export function featureGroups(area: FeatureArea): string[] {
  const s = new Set<string>();
  for (const f of FEATURE_CATALOG) if (f.area === area) s.add(f.group);
  return Array.from(s);
}
