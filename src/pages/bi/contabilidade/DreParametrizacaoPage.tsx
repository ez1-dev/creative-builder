import { useEffect, useMemo, useState } from 'react';
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Power, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  listarRegras, alternarAtivo, excluirRegra, type DreDeParaRegra, type DreDeParaFiltros,
} from '@/lib/bi/dreDeparaApi';
import {
  DRE_MASCARAS_DEPARA, CENTRO_CUSTOS_TODAS, descricaoMascara,
} from '@/lib/bi/dreDepara';
import { DreDeParaModal } from '@/components/bi/contabilidade/DreDeParaModal';

export default function DreParametrizacaoPage() {
  const [loading, setLoading] = useState(false);
  const [regras, setRegras] = useState<DreDeParaRegra[]>([]);
  const [conta, setConta] = useState('');
  const [centro, setCentro] = useState('');
  const [mascara, setMascara] = useState<string>('TODAS');
  const [somenteAtivos, setSomenteAtivos] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('ATIVOS');
  const [modal, setModal] = useState<{ open: boolean; regra: DreDeParaRegra | null }>({
    open: false, regra: null,
  });
  const [excluir, setExcluir] = useState<DreDeParaRegra | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const filtros: DreDeParaFiltros = {
        conta: conta.trim() || undefined,
        centro: centro.trim() || undefined,
        mascara: mascara !== 'TODAS' ? mascara : undefined,
        somenteAtivos: somenteAtivos === 'ATIVOS',
      };
      let dados = await listarRegras(filtros);
      if (somenteAtivos === 'INATIVOS') dados = dados.filter((r) => !r.ativo);
      setRegras(dados);
    } catch (e: any) {
      toast.error(`Falha ao carregar regras: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, []);

  const totalAtivos = useMemo(() => regras.filter((r) => r.ativo).length, [regras]);

  const onToggle = async (r: DreDeParaRegra) => {
    try {
      await alternarAtivo(r.id, !r.ativo);
      toast.success(r.ativo ? 'Regra desativada.' : 'Regra reativada.');
      void carregar();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`);
    }
  };

  const onExcluir = async () => {
    if (!excluir) return;
    try {
      await excluirRegra(excluir.id);
      toast.success('Regra excluída.');
      setExcluir(null);
      void carregar();
    } catch (e: any) {
      toast.error(`Falha ao excluir: ${e?.message ?? e}`);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Parametrização DRE"
        description="De/para de conta contábil + centro de custos para máscara da DRE."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/bi/contabilidade/dre"><ArrowLeft className="h-3.5 w-3.5 mr-1" />Voltar à DRE</Link>
            </Button>
            <Button size="sm" onClick={() => setModal({ open: true, regra: null })}>
              <Plus className="h-3.5 w-3.5 mr-1" />Nova regra
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div>
              <Label className="text-xs">Conta contábil</Label>
              <Input
                className="h-8 text-xs"
                value={conta}
                onChange={(e) => setConta(e.target.value.toUpperCase())}
                placeholder="ex.: 3.1.01"
              />
            </div>
            <div>
              <Label className="text-xs">Centro de custos</Label>
              <Input
                className="h-8 text-xs"
                value={centro}
                onChange={(e) => setCentro(e.target.value.toUpperCase())}
                placeholder="ex.: 01.001 ou TODAS"
              />
            </div>
            <div>
              <Label className="text-xs">Máscara DRE</Label>
              <Select value={mascara} onValueChange={setMascara}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS" className="text-xs">Todas</SelectItem>
                  {DRE_MASCARAS_DEPARA.map((m) => (
                    <SelectItem key={m.codigo} value={m.codigo} className="text-xs">
                      <span className="font-mono mr-2">{m.codigo}</span>{m.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Situação</Label>
              <Select value={somenteAtivos} onValueChange={(v: any) => setSomenteAtivos(v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVOS" className="text-xs">Apenas ativas</SelectItem>
                  <SelectItem value="INATIVOS" className="text-xs">Apenas inativas</SelectItem>
                  <SelectItem value="TODOS" className="text-xs">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button size="sm" className="h-8 w-full" onClick={carregar} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Filtrar
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {regras.length} regra(s) · {totalAtivos} ativa(s)
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
                  <TableHead>Conta contábil</TableHead>
                  <TableHead>Centro de custos</TableHead>
                  <TableHead>Máscara DRE</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-44 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-8">
                      {loading ? 'Carregando...' : 'Nenhuma regra encontrada.'}
                    </TableCell>
                  </TableRow>
                )}
                {regras.map((r) => (
                  <TableRow key={r.id} className={!r.ativo ? 'opacity-50' : ''}>
                    <TableCell className="text-xs font-mono">{r.cd_conta_contabil}</TableCell>
                    <TableCell className="text-xs">
                      {r.cd_centro_custos === CENTRO_CUSTOS_TODAS ? (
                        <Badge variant="outline" className="text-[10px]">TODAS</Badge>
                      ) : (
                        <span className="font-mono">{r.cd_centro_custos}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-mono">{r.cd_mascara_dre}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {descricaoMascara(r.cd_mascara_dre) ?? '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate" title={r.descricao ?? ''}>
                      {r.descricao ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.ativo ? 'default' : 'secondary'} className="text-[10px]">
                        {r.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                          onClick={() => setModal({ open: true, regra: r })}>
                          <Pencil className="h-3 w-3 mr-1" />Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                          onClick={() => onToggle(r)}>
                          <Power className="h-3 w-3 mr-1" />{r.ativo ? 'Desativar' : 'Reativar'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-destructive"
                          onClick={() => setExcluir(r)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DreDeParaModal
        open={modal.open}
        onOpenChange={(o) => setModal((s) => ({ ...s, open: o }))}
        regra={modal.regra}
        onSaved={carregar}
      />

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Essa regra de classificação será removida permanentemente. Considere desativar em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onExcluir}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
