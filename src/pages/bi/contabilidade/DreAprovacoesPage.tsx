import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  listarClassificacoes, atualizarStatusClassificacao,
  type DreClassificacao, type DreClassificacaoStatus,
} from '@/lib/bi/dreClassificarApi';
import { formatCurrency } from '@/components/bi/utils/formatters';

const statusVariant: Record<DreClassificacaoStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ATIVO: 'default',
  PENDENTE_APROVACAO: 'secondary',
  APROVADO: 'default',
  REJEITADO: 'destructive',
  INATIVO: 'outline',
};

export default function DreAprovacoesPage() {
  const [loading, setLoading] = useState(false);
  const [linhas, setLinhas] = useState<DreClassificacao[]>([]);
  const [aba, setAba] = useState<'PENDENTE' | 'TODAS'>('PENDENTE');

  const carregar = async () => {
    setLoading(true);
    try {
      const dados = await listarClassificacoes(
        aba === 'PENDENTE' ? { status: 'PENDENTE_APROVACAO' } : {},
      );
      setLinhas(dados);
    } catch (e: any) {
      toast.error(`Falha ao carregar: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [aba]);

  const aplicar = async (id: string, novo: DreClassificacaoStatus) => {
    try {
      await atualizarStatusClassificacao(id, novo);
      toast.success('Status atualizado.');
      await carregar();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="DRE — Aprovações de Classificação"
        description="Regras definitivas pendentes e histórico de classificações aplicadas à DRE."
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/bi/contabilidade/dre"><ArrowLeft className="h-3.5 w-3.5 mr-1" />Voltar à DRE</Link>
          </Button>
          <Button
            variant={aba === 'PENDENTE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAba('PENDENTE')}
          >Pendentes</Button>
          <Button
            variant={aba === 'TODAS' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAba('TODAS')}
          >Todas</Button>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Recarregar
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">{linhas.length} registros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Escopo</TableHead>
                  <TableHead className="text-xs">Origem → Destino</TableHead>
                  <TableHead className="text-xs">Lcto / Doc</TableHead>
                  <TableHead className="text-xs">TNS / Conta</TableHead>
                  <TableHead className="text-xs">Motivo</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Badge variant={statusVariant[l.status]} className="text-[10px]">{l.status}</Badge></TableCell>
                    <TableCell className="text-xs">{l.escopo}</TableCell>
                    <TableCell className="text-xs">
                      <span className="text-muted-foreground">{l.codigo_linha_origem}</span>
                      {' → '}
                      <span className="font-medium">{l.codigo_linha_destino}</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{l.nr_lancamento ?? '-'}</div>
                      <div className="text-muted-foreground">{l.nr_documento ?? '-'}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{l.cd_tns ?? '-'}</div>
                      <div className="text-muted-foreground">{l.cd_conta_contabil ?? '-'}</div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate" title={l.motivo}>{l.motivo}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {l.vl_realizado != null ? formatCurrency(Number(l.vl_realizado)) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {l.status === 'PENDENTE_APROVACAO' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => aplicar(l.id, 'APROVADO')}>
                              <Check className="h-3 w-3 mr-1" />Aprovar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => aplicar(l.id, 'REJEITADO')}>
                              <X className="h-3 w-3 mr-1" />Rejeitar
                            </Button>
                          </>
                        )}
                        {l.status === 'ATIVO' && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => aplicar(l.id, 'INATIVO')}>
                            Desativar
                          </Button>
                        )}
                        {l.status === 'INATIVO' && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => aplicar(l.id, 'ATIVO')}>
                            Reativar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && linhas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-xs">
                      Nenhuma classificação encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
