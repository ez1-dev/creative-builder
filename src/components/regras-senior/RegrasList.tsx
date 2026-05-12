import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTableBI, Column } from '@/components/bi/tables/DataTableBI';
import { Plus, FileDown, Eye, Pencil, RotateCw } from 'lucide-react';
import { seniorApi } from '@/lib/senior/api';
import type { RegraLSP, StatusRegra } from '@/lib/senior/types';
import { StatusRegraBadge, STATUS_REGRA_OPTS } from './StatusRegraBadge';
import { PageHeader } from '@/components/erp/PageHeader';
import { toast } from 'sonner';
import { AlterarStatusRegraDialog } from './AlterarStatusRegraDialog';

function OrigemBadge({ value }: { value?: string | null }) {
  if (value === 'PORTAL') {
    return <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent">Portal</Badge>;
  }
  // default E098REG / ERP
  return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ERP Senior</Badge>;
}

const STATUS_OPTS: { value: StatusRegra | ''; label: string }[] = [
  { value: '', label: 'Todos status' },
  ...STATUS_REGRA_OPTS,
];

export function RegrasList() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [statusF, setStatusF] = useState<StatusRegra | ''>('');
  const [idereg, setIdereg] = useState('');
  const [data, setData] = useState<RegraLSP[]>([]);
  const [loading, setLoading] = useState(false);
  const [alterar, setAlterar] = useState<RegraLSP | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const rows = await seniorApi.listarRegras({ texto, status_regra: statusF || undefined, idereg: idereg || undefined });
      setData(rows ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao listar regras');
      setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); /* initial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportarTxt = (r: RegraLSP) => {
    try {
      const url = seniorApi.exportarRegraTxtUrl(r.id);
      window.open(url, '_blank');
    } catch {
      // fallback client-side
      const blob = new Blob([r.fonte_lsp ?? ''], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `regra-${r.id}-${r.nome_regra}.txt`;
      a.click();
    }
  };

  const columns: Column<RegraLSP>[] = useMemo(() => [
    { key: 'id_regra', header: 'ID', sortable: true, render: (v) => v ?? '—' },
    { key: 'origem', header: 'Origem', render: (v) => <OrigemBadge value={v as string} /> },
    { key: 'nome_regra', header: 'Nome', sortable: true },
    { key: 'codreg_erp', header: 'Cód ERP', sortable: true },
    { key: 'modsis', header: 'Módulo' },
    { key: 'idereg', header: 'Identificador' },
    { key: 'codtns', header: 'Transação' },
    { key: 'status_regra', header: 'Status', render: (v) => <StatusRegraBadge value={v} /> },
    { key: 'ambiente', header: 'Ambiente' },
    { key: 'ticket', header: 'Ticket' },
    { key: 'criado_por', header: 'Criado por' },
    {
      key: 'criado_em', header: 'Data',
      render: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—',
    },
    {
      key: '__acoes', header: 'Ações',
      render: (_v, r) => {
        const semIdPortal = r.id_regra == null;
        const tooltip = semIdPortal ? 'Disponível apenas para regras criadas no portal' : '';
        return (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" title={tooltip || 'Ver detalhes'} disabled={semIdPortal}
              onClick={() => navigate(`/regras-senior/regras/${r.id_regra}`)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" title={tooltip || 'Editar'} disabled={semIdPortal}
              onClick={() => navigate(`/regras-senior/regras/${r.id_regra}?edit=1`)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" title={tooltip || 'Exportar TXT'} disabled={semIdPortal}
              onClick={() => exportarTxt(r)}>
              <FileDown className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={semIdPortal} title={tooltip}
              onClick={() => setAlterar(r)}>Status</Button>
          </div>
        );
      },
    },
  ], [navigate]);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Regras LSP"
        description="Listagem e gestão de regras do ERP Senior."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={carregar}><RotateCw className="mr-1 h-4 w-4" />Atualizar</Button>
            <Button size="sm" onClick={() => navigate('/regras-senior/regras/nova')}><Plus className="mr-1 h-4 w-4" />Nova regra</Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <label className="text-xs text-muted-foreground">Busca</label>
              <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nome, código, descrição…" />
            </div>
            <div className="w-[180px]">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={statusF || 'all'} onValueChange={(v) => setStatusF(v === 'all' ? '' : (v as StatusRegra))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((o) => (
                    <SelectItem key={o.value || 'all'} value={o.value || 'all'}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <label className="text-xs text-muted-foreground">Identificador</label>
              <Input value={idereg} onChange={(e) => setIdereg(e.target.value)} placeholder="IDEREG" />
            </div>
            <Button size="sm" onClick={carregar}>Filtrar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setTexto(''); setStatusF(''); setIdereg(''); }}>Limpar</Button>
          </div>
        </CardContent>
      </Card>

      <DataTableBI<RegraLSP>
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="Nenhuma regra cadastrada ainda."
        enableSearch={false}
      />

      {alterar && (
        <AlterarStatusRegraDialog
          regra={alterar}
          onClose={() => setAlterar(null)}
          onDone={() => { setAlterar(null); carregar(); }}
        />
      )}
    </div>
  );
}
