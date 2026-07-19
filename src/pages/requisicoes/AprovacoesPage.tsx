import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

export default function AprovacoesPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Aprovações de requisições" description="Fila pendente do usuário logado." />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Tela de aprovação (aprovar total, aprovar parcial, rejeitar, devolver para ajuste com justificativa)
          será liberada na Fase 3, junto com os endpoints <code>/aprovar</code>, <code>/rejeitar</code> e
          histórico consolidado.
        </CardContent>
      </Card>
    </div>
  );
}
