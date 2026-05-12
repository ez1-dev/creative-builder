import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTableBI, Column } from '@/components/bi/tables/DataTableBI';
import { ArrowRight, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { AuditoriaEntry, SituacaoIdentificador } from '@/lib/senior/types';
import { PageHeader } from '@/components/erp/PageHeader';
import { SituacaoBadge } from './SituacaoBadge';

function ResultadoBadge({ value }: { value?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const ok = value === 'sucesso';
  return (
    <Badge variant="outline" className={ok
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
      : 'bg-destructive/15 text-destructive border-destructive/30'}>
      {ok ? 'Sucesso' : value}
    </Badge>
  );
}

export function AuditoriaList() {
  const [sp] = useSearchParams();
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [acao, setAcao] = useState('');
  const [usuario, setUsuario] = useState('');
  const [codemp, setCodemp] = useState(sp.get('codemp') ?? '');
  const [modsis, setModsis] = useState(sp.get('modsis') ?? '');
  const [idereg, setIdereg] = useState(sp.get('idereg') ?? '');
  const [data, setData] = useState<AuditoriaEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const rows = await seniorApi.listarAuditoria({
        de: de || undefined, ate: ate || undefined,
        acao: acao || undefined, usuario: usuario || undefined,
        codemp: codemp ? Number(codemp) : undefined,
        modsis: modsis || undefined,
        idereg: idereg || undefined,
      });
      setData(rows ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao listar auditoria');
      setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: Column<AuditoriaEntry>[] = useMemo(() => [
    { key: 'data', header: 'Data/hora', render: (v) => v ? new Date(v).toLocaleString('pt-BR') : '—', sortable: true },
    { key: 'usuario', header: 'Usuário' },
    { key: 'acao', header: 'Ação' },
    { key: 'codemp', header: 'Emp', align: 'right' },
    { key: 'modsis', header: 'Módulo' },
    { key: 'idereg', header: 'Identificador' },
    {
      key: '__regra', header: 'Regra (ant. → nova)',
      render: (_v, r) => (r.regra_anterior == null && r.regra_nova == null) ? '—' : (
        <span className="inline-flex items-center gap-1 text-xs">
          {r.regra_anterior ?? '—'} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {r.regra_nova ?? '—'}
        </span>
      ),
    },
    {
      key: '__sit', header: 'Situação (ant. → nova)',
      render: (_v, r) => (!r.situacao_anterior && !r.situacao_nova) ? '—' : (
        <span className="inline-flex items-center gap-1">
          {r.situacao_anterior ? <SituacaoBadge value={r.situacao_anterior as SituacaoIdentificador} /> : '—'}
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          {r.situacao_nova ? <SituacaoBadge value={r.situacao_nova as SituacaoIdentificador} /> : '—'}
        </span>
      ),
    },
    { key: 'motivo', header: 'Motivo' },
    { key: 'resultado', header: 'Resultado', render: (v) => <ResultadoBadge value={v} /> },
  ], []);

  const limpar = () => {
    setDe(''); setAte(''); setAcao(''); setUsuario(''); setCodemp(''); setModsis(''); setIdereg('');
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Auditoria"
        description="Histórico de alterações em regras e identificadores (USU_AUD_IDENT_REGRA)."
        actions={<Button variant="outline" size="sm" onClick={carregar}><RotateCw className="mr-1 h-4 w-4" />Atualizar</Button>}
      />
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[140px]"><label className="text-xs text-muted-foreground">De</label>
              <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
            <div className="w-[140px]"><label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
            <div className="w-[160px]"><label className="text-xs text-muted-foreground">Ação</label>
              <Input value={acao} onChange={(e) => setAcao(e.target.value)} /></div>
            <div className="w-[160px]"><label className="text-xs text-muted-foreground">Usuário</label>
              <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} /></div>
            <div className="w-[100px]"><label className="text-xs text-muted-foreground">Empresa</label>
              <Input value={codemp} onChange={(e) => setCodemp(e.target.value)} /></div>
            <div className="w-[110px]"><label className="text-xs text-muted-foreground">Módulo</label>
              <Input value={modsis} onChange={(e) => setModsis(e.target.value)} /></div>
            <div className="w-[160px]"><label className="text-xs text-muted-foreground">Identificador</label>
              <Input value={idereg} onChange={(e) => setIdereg(e.target.value)} /></div>
            <Button size="sm" onClick={carregar}>Filtrar</Button>
            <Button size="sm" variant="ghost" onClick={limpar}>Limpar</Button>
          </div>
        </CardContent>
      </Card>

      <DataTableBI<AuditoriaEntry>
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="Nenhum registro de auditoria."
      />
    </div>
  );
}
