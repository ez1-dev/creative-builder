import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableBI, Column } from '@/components/bi/tables/DataTableBI';
import { RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { AuditoriaEntry } from '@/lib/senior/types';
import { PageHeader } from '@/components/erp/PageHeader';

export function AuditoriaList() {
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [acao, setAcao] = useState('');
  const [usuario, setUsuario] = useState('');
  const [data, setData] = useState<AuditoriaEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const rows = await seniorApi.listarAuditoria({ de: de || undefined, ate: ate || undefined, acao: acao || undefined, usuario: usuario || undefined });
      setData(rows ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao listar auditoria');
      setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: Column<AuditoriaEntry>[] = useMemo(() => [
    { key: 'data', header: 'Data', render: (v) => v ? new Date(v).toLocaleString('pt-BR') : '—', sortable: true },
    { key: 'usuario', header: 'Usuário' },
    { key: 'acao', header: 'Ação' },
    { key: 'alvo', header: 'Alvo' },
    { key: 'motivo', header: 'Motivo' },
  ], []);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Auditoria"
        description="Histórico de alterações realizadas em regras e identificadores."
        actions={<Button variant="outline" size="sm" onClick={carregar}><RotateCw className="mr-1 h-4 w-4" />Atualizar</Button>}
      />
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[150px]">
              <label className="text-xs text-muted-foreground">De</label>
              <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </div>
            <div className="w-[150px]">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </div>
            <div className="w-[180px]">
              <label className="text-xs text-muted-foreground">Ação</label>
              <Input value={acao} onChange={(e) => setAcao(e.target.value)} />
            </div>
            <div className="w-[180px]">
              <label className="text-xs text-muted-foreground">Usuário</label>
              <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            </div>
            <Button size="sm" onClick={carregar}>Filtrar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setDe(''); setAte(''); setAcao(''); setUsuario(''); }}>Limpar</Button>
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
