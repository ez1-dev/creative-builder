import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTableBI, Column } from '@/components/bi/tables/DataTableBI';
import { Camera, Download, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { SnapshotEntry } from '@/lib/senior/types';
import { PageHeader } from '@/components/erp/PageHeader';
import { useIsSeniorAdmin } from '@/hooks/useIsSeniorAdmin';

export function SnapshotsList() {
  const { isSeniorAdmin } = useIsSeniorAdmin();
  const [rows, setRows] = useState<SnapshotEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await seniorApi.listarSnapshots();
      setRows(r ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const gerar = async () => {
    setGerando(true);
    try {
      const snap = await seniorApi.gerarSnapshot();
      toast.success(`Snapshot gerado${snap?.qtde_registros ? ` com ${snap.qtde_registros} registros` : ''}.`);
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao gerar snapshot');
    } finally { setGerando(false); }
  };

  const columns: Column<SnapshotEntry>[] = [
    { key: 'data', header: 'Data/hora', render: (v) => v ? new Date(v).toLocaleString('pt-BR') : '—', sortable: true },
    { key: 'usuario', header: 'Usuário' },
    { key: 'qtde_registros', header: 'Qtde registros', align: 'right', sortable: true },
    {
      key: '__acoes', header: 'Ações',
      render: (_v, r) => (
        <a href={seniorApi.downloadSnapshotUrl(r.id)} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline"><Download className="mr-1 h-3.5 w-3.5" />Download</Button>
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Snapshots da E098REG"
        description="Capturas do estado dos identificadores para auditoria e comparação."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={carregar}><RotateCw className="mr-1 h-4 w-4" />Atualizar</Button>
            <Button size="sm" onClick={gerar} disabled={!isSeniorAdmin || gerando}>
              <Camera className="mr-1 h-4 w-4" />{gerando ? 'Gerando…' : 'Gerar snapshot'}
            </Button>
          </>
        }
      />
      {!isSeniorAdmin && (
        <Card><CardContent className="p-3 text-xs text-muted-foreground">
          Apenas administradores podem gerar snapshots.
        </CardContent></Card>
      )}
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <DataTableBI<SnapshotEntry>
          columns={columns}
          data={rows}
          emptyMessage="Nenhum snapshot gerado ainda."
        />
      )}
    </div>
  );
}
