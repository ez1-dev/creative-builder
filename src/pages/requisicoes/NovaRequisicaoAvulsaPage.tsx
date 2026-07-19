import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

export default function NovaRequisicaoAvulsaPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nova requisição — sem OP" description="Consumo, transferência, devolução ou emergencial." />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Formulário completo (setor, tipo, prioridade, centro de custo, depósito de origem/destino, itens,
          lote/série, anexos) será liberado na Fase 4, junto com os endpoints de gravação sem OP.
          <br /><br />
          A gravação nativa passará por <code>SID.Est.Requisitar</code>, <code>SID.Est.GravarRateioRequisicao</code>,
          <code> SID.Est.AtenderRequisicao</code>, <code>SID.Est.ExcluirRequisicao</code> e{' '}
          <code>SID.Est.BuscarEstoqueDisp</code> — sempre pela API :8070, nunca por SOAP no navegador.
        </CardContent>
      </Card>
    </div>
  );
}
