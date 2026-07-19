import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

export default function SeparacaoAgrupadaPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Separação agrupada" description="Agrupamento de componentes iguais de várias OPs mantendo rateio individual." />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Visualização agrupada por produto/derivação/depósito preservando o vínculo
          <code> (CODEMP, CODORI, NUMORP, CODETG, SEQCMP, CODCMP, CODDER)</code> chegará na Fase 3.
        </CardContent>
      </Card>
    </div>
  );
}
