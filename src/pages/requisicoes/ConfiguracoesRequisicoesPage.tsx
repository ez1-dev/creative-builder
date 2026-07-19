import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useConfigRequisicoes } from '@/hooks/requisicoes';
import { Skeleton } from '@/components/ui/skeleton';

export default function ConfiguracoesRequisicoesPage() {
  const cfg = useConfigRequisicoes();
  return (
    <div className="space-y-4">
      <PageHeader title="Configurações — Requisição de Materiais" description="Parâmetros do módulo (não sobrescrevem a regra 900SDPBC01)." />
      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          {cfg.isLoading && <Skeleton className="h-24 w-full" />}
          {cfg.data && (
            <>
              <div><strong>Tipos habilitados:</strong> {cfg.data.tipos_habilitados.join(', ')}</div>
              <div><strong>Depósitos permitidos:</strong> {cfg.data.depositos_permitidos.join(', ')}</div>
              <div><strong>Exige aprovação:</strong> {cfg.data.exige_aprovacao ? 'Sim' : 'Não'}</div>
              <div><strong>Limite aprovação automática:</strong> {cfg.data.limite_aprovacao_automatica ?? '—'}</div>
              <div><strong>Tolerância OP:</strong> {cfg.data.tolerancia_op_pct}%</div>
              <div><strong>SLA (h):</strong> {cfg.data.sla_horas ?? '—'}</div>
              <p className="mt-3 text-xs text-muted-foreground">
                Edição visual dessas configurações será liberada na Fase 4, junto com o endpoint
                <code> PUT /api/requisicoes/configuracoes</code>.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
