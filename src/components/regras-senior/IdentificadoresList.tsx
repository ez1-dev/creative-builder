import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTableBI, Column } from '@/components/bi/tables/DataTableBI';
import { Camera, RotateCw, Power, GitBranch, History } from 'lucide-react';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { Identificador, SituacaoIdentificador } from '@/lib/senior/types';
import { SituacaoBadge } from './SituacaoBadge';
import { PageHeader } from '@/components/erp/PageHeader';
import { AlterarSituacaoDialog } from './AlterarSituacaoDialog';
import { AlterarRegraDialog } from './AlterarRegraDialog';
import { AvisoErpBanner } from './AvisoErpBanner';
import { useIsSeniorAdmin } from '@/hooks/useIsSeniorAdmin';

export function IdentificadoresList() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { isSeniorAdmin } = useIsSeniorAdmin();
  const [codemp, setCodemp] = useState(sp.get('codemp') ?? '');
  const [modsis, setModsis] = useState(sp.get('modsis') ?? '');
  const [idereg, setIdereg] = useState(sp.get('idereg') ?? '');
  const [situacao, setSituacao] = useState<SituacaoIdentificador | ''>('');
  const [codreg, setCodreg] = useState('');
  const [texto, setTexto] = useState('');
  const [data, setData] = useState<Identificador[]>([]);
  const [loading, setLoading] = useState(false);

  const [alterarSit, setAlterarSit] = useState<Identificador | null>(null);
  const [alterarReg, setAlterarReg] = useState<Identificador | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const rows = await seniorApi.listarIdentificadores({
        codemp: codemp ? Number(codemp) : undefined,
        modsis: modsis || undefined,
        idereg: idereg || undefined,
        situacao: situacao || undefined,
        codreg: codreg ? Number(codreg) : undefined,
        texto: texto || undefined,
      } as any);
      setData(rows ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao listar identificadores');
      setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapshot = async () => {
    try {
      await seniorApi.gerarSnapshot();
      toast.success('Snapshot gerado com sucesso.');
      navigate('/regras-senior/snapshots');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao gerar snapshot');
    }
  };

  const columns: Column<Identificador>[] = useMemo(() => [
    { key: 'codemp', header: 'Empresa', sortable: true },
    { key: 'modsis', header: 'Módulo' },
    { key: 'idereg', header: 'Identificador' },
    { key: 'codtns', header: 'Transação' },
    { key: 'descricao', header: 'Descrição' },
    { key: 'codreg', header: 'Cód regra', sortable: true },
    { key: 'situacao', header: 'Situação', render: (v) => <SituacaoBadge value={v} /> },
    { key: 'observacao', header: 'Observação' },
    {
      key: '__acoes', header: 'Ações',
      render: (_v, r) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={!isSeniorAdmin}
            title={isSeniorAdmin ? 'Alterar situação' : 'Somente administradores'}
            onClick={() => setAlterarSit(r)}>
            <Power className="mr-1 h-3.5 w-3.5" />Situação
          </Button>
          <Button size="sm" variant="outline" disabled={!isSeniorAdmin}
            title={isSeniorAdmin ? 'Alterar regra vinculada' : 'Somente administradores'}
            onClick={() => setAlterarReg(r)}>
            <GitBranch className="mr-1 h-3.5 w-3.5" />Regra
          </Button>
          <Button size="icon" variant="ghost" title="Ver log"
            onClick={() => navigate(`/regras-senior/auditoria?codemp=${r.codemp}&modsis=${encodeURIComponent(r.modsis)}&idereg=${encodeURIComponent(r.idereg)}`)}>
            <History className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [isSeniorAdmin, navigate]);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Identificadores (E098REG)"
        description="Consulta e ações sobre identificadores do ERP Senior."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={carregar}><RotateCw className="mr-1 h-4 w-4" />Atualizar</Button>
            <Button size="sm" onClick={snapshot} disabled={!isSeniorAdmin}
              title={isSeniorAdmin ? 'Gerar snapshot' : 'Somente administradores'}>
              <Camera className="mr-1 h-4 w-4" />Gerar Snapshot
            </Button>
          </>
        }
      />
      <AvisoErpBanner />

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[110px]">
              <label className="text-xs text-muted-foreground">Empresa</label>
              <Input value={codemp} onChange={(e) => setCodemp(e.target.value)} />
            </div>
            <div className="w-[110px]">
              <label className="text-xs text-muted-foreground">Módulo</label>
              <Input value={modsis} onChange={(e) => setModsis(e.target.value)} />
            </div>
            <div className="w-[150px]">
              <label className="text-xs text-muted-foreground">Identificador</label>
              <Input value={idereg} onChange={(e) => setIdereg(e.target.value)} />
            </div>
            <div className="w-[110px]">
              <label className="text-xs text-muted-foreground">Cód regra</label>
              <Input value={codreg} onChange={(e) => setCodreg(e.target.value)} />
            </div>
            <div className="w-[150px]">
              <label className="text-xs text-muted-foreground">Situação</label>
              <Select value={situacao || 'all'} onValueChange={(v) => setSituacao(v === 'all' ? '' : (v as SituacaoIdentificador))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="A">A — Ativo</SelectItem>
                  <SelectItem value="I">I — Inativo</SelectItem>
                  <SelectItem value="X">X — Teste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="text-xs text-muted-foreground">Busca</label>
              <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Texto…" />
            </div>
            <Button size="sm" onClick={carregar}>Filtrar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setCodemp(''); setModsis(''); setIdereg(''); setSituacao(''); setCodreg(''); setTexto(''); }}>Limpar</Button>
          </div>
        </CardContent>
      </Card>

      <DataTableBI<Identificador>
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="Nenhum identificador encontrado."
      />

      {alterarSit && (
        <AlterarSituacaoDialog ident={alterarSit} onClose={() => setAlterarSit(null)} onDone={() => { setAlterarSit(null); carregar(); }} />
      )}
      {alterarReg && (
        <AlterarRegraDialog ident={alterarReg} onClose={() => setAlterarReg(null)} onDone={() => { setAlterarReg(null); carregar(); }} />
      )}
    </div>
  );
}
