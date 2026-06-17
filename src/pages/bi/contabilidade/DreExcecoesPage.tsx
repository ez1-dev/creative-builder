import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Power } from 'lucide-react';
import { toast } from 'sonner';
import {
  listarExcecoes, atualizarExcecao, type DreExcecao,
} from '@/lib/bi/dreExcecoesApi';
import { formatCurrency } from '@/components/bi/utils/formatters';

export default function DreExcecoesPage() {
  const [loading, setLoading] = useState(false);
  const [linhas, setLinhas] = useState<DreExcecao[]>([]);
  const [filtroAtivo, setFiltroAtivo] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('ATIVO');
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [filtroDestino, setFiltroDestino] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const dados = await listarExcecoes({
        ativo: filtroAtivo === 'TODOS' ? undefined : filtroAtivo === 'ATIVO',
        codigo_linha_origem: filtroOrigem.trim() || undefined,
        codigo_linha_destino: filtroDestino.trim() || undefined,
      });
      setLinhas(dados);
    } catch (e: any) {
      toast.error(`Falha ao carregar exceções: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (e: DreExcecao) => {
    try {
      await atualizarExcecao(e.id, { ativo: !e.ativo });
      toast.success(e.ativo ? 'Exceção desativada.' : 'Exceção reativada.');
      void carregar();
    } catch (err: any) {
      toast.error(`Falha: ${err?.message ?? err}`);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Exceções da DRE"
        description="Lançamentos redirecionados para outra linha sem alterar a regra geral."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/bi/contabilidade/dre"><ArrowLeft className="h-3.5 w-3.5 mr-1" />Voltar à DRE</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">Situação</Label>
              <Select value={filtroAtivo} onValueChange={(v: any) => setFiltroAtivo(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativas</SelectItem>
                  <SelectItem value="INATIVO">Inativas</SelectItem>
                  <SelectItem value="TODOS">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Linha origem</Label>
              <Input
                className="h-8 text-xs"
                value={filtroOrigem}
                onChange={(e) => setFiltroOrigem(e.target.value.toUpperCase())}
                placeholder="ex.: RECEITA_BRUTA"
              />
            </div>
            <div>
              <Label className="text-xs">Linha destino</Label>
              <Input
                className="h-8 text-xs"
                value={filtroDestino}
                onChange={(e) => setFiltroDestino(e.target.value.toUpperCase())}
                placeholder="ex.: NAO_CLASSIFICADO"
              />
            </div>
            <div>
              <Button size="sm" className="h-8 w-full" onClick={carregar} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {linhas.length} registro(s)
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem → Destino</TableHead>
                  <TableHead>Lançamento</TableHead>
                  <TableHead>Doc.</TableHead>
                  <TableHead>TNS</TableHead>
                  <TableHead>CC</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Carregando...' : 'Nenhuma exceção encontrada.'}
                    </TableCell>
                  </TableRow>
                )}
                {linhas.map((e) => (
                  <TableRow key={e.id} className={!e.ativo ? 'opacity-50' : ''}>
                    <TableCell className="text-xs">
                      <span className="font-medium">{e.codigo_linha_origem}</span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="font-medium">{e.codigo_linha_destino}</span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{e.nr_lancamento}</TableCell>
                    <TableCell className="text-xs tabular-nums">{e.nr_documento ?? '-'}</TableCell>
                    <TableCell className="text-xs">{e.cd_transacao ?? '-'}</TableCell>
                    <TableCell className="text-xs">{e.cd_cencus ?? '-'}</TableCell>
                    <TableCell className="text-xs tabular-nums">{e.anomes_referente ?? '-'}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {e.vl_realizado != null ? formatCurrency(Number(e.vl_realizado)) : '-'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate" title={e.motivo}>
                      {e.motivo}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.ativo ? 'default' : 'secondary'} className="text-[10px]">
                        {e.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => toggle(e)}
                      >
                        <Power className="h-3 w-3 mr-1" />
                        {e.ativo ? 'Desativar' : 'Reativar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
