import { Badge } from '@/components/ui/badge';
import type { StatusRequisicao } from '@/types/requisicoes';

const MAP: Record<StatusRequisicao, { label: string; className: string }> = {
  RASCUNHO:                 { label: 'Rascunho',              className: 'bg-muted text-muted-foreground border-muted' },
  AGUARDANDO_APROVACAO:     { label: 'Aguardando aprovação',  className: 'bg-amber-100 text-amber-800 border-amber-200' },
  APROVADA:                 { label: 'Aprovada',              className: 'bg-amber-100 text-amber-800 border-amber-200' },
  REJEITADA:                { label: 'Rejeitada',             className: 'bg-red-100 text-red-800 border-red-200' },
  DEVOLVIDA_AJUSTE:         { label: 'Devolvida p/ ajuste',   className: 'bg-orange-100 text-orange-800 border-orange-200' },
  AGUARDANDO_ALMOXARIFADO:  { label: 'Aguardando separação',  className: 'bg-amber-100 text-amber-800 border-amber-200' },
  EM_SEPARACAO:             { label: 'Em separação',          className: 'bg-blue-100 text-blue-800 border-blue-200' },
  SEPARADA:                 { label: 'Separada',              className: 'bg-blue-100 text-blue-800 border-blue-200' },
  PARCIALMENTE_ATENDIDA:    { label: 'Parcialmente atendida', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  AGUARDANDO_SALDO:         { label: 'Aguardando saldo',      className: 'bg-orange-100 text-orange-800 border-orange-200' },
  AGUARDANDO_COMPRA:        { label: 'Aguardando compra',     className: 'bg-purple-100 text-purple-800 border-purple-200' },
  ATENDIDA:                 { label: 'Atendida',              className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CANCELADA:                { label: 'Cancelada',             className: 'bg-red-100 text-red-800 border-red-200' },
  ESTORNADA:                { label: 'Estornada',             className: 'bg-red-100 text-red-800 border-red-200' },
  NAO_ENVIADA:              { label: 'Não enviada',           className: 'bg-slate-100 text-slate-700 border-slate-200' },
  PENDENTE_INTEGRACAO:      { label: 'Pendente integração',   className: 'bg-amber-100 text-amber-800 border-amber-200' },
  PROCESSANDO:              { label: 'Processando',           className: 'bg-blue-100 text-blue-800 border-blue-200' },
  INTEGRADA:                { label: 'Integrada',             className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  ERRO_INTEGRACAO:          { label: 'Erro de integração',    className: 'bg-red-100 text-red-800 border-red-200' },
};

export function StatusBadge({ status }: { status: StatusRequisicao }) {
  const info = MAP[status] ?? { label: status, className: '' };
  return <Badge variant="outline" className={info.className}>{info.label}</Badge>;
}
