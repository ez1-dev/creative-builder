import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/erp/PageHeader';
import { Factory, PackageMinus } from 'lucide-react';

export default function NovaRequisicaoPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Nova requisição" description="Escolha o tipo de requisição a ser criada." />
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/requisicoes/nova-op" className="block">
          <Card className="h-full transition hover:border-primary hover:shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-primary" />
                <CardTitle>Requisição com OP</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Para componentes previstos em uma Ordem de Produção. Transferência para depósito produtivo
              ou baixa direta na OP.
            </CardContent>
          </Card>
        </Link>
        <Link to="/requisicoes/nova-avulsa" className="block">
          <Card className="h-full transition hover:border-primary hover:shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PackageMinus className="h-5 w-5 text-primary" />
                <CardTitle>Requisição sem OP</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Consumo interno, manutenção, qualidade, administrativo ou transferência entre depósitos.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
