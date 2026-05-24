import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { programacaoApi, type ProgramacaoFiltros } from '@/lib/producao/programacaoApi';
import { useQueryClient } from '@tanstack/react-query';

const UNIDADES = ['TODOS', 'GENIUS', 'ESTRUTURAL', 'APOIO', 'NAO_CLASSIFICADO'];
const TIPOS = ['TODOS', 'PRODUCAO', 'TERCEIROS', 'LOGISTICA', 'MANUTENCAO'];
const STATUS = ['TODOS', 'PROGRAMADO', 'EXECUTANDO', 'CONCLUIDO', 'CANCELADO'];

interface Props {
  filtros: ProgramacaoFiltros;
  onChange: (f: ProgramacaoFiltros) => void;
  onRefresh?: () => void;
  loading?: boolean;
  /** Quando true, mostra também filtro de status programação e lote */
  showStatus?: boolean;
}

export function ProgramacaoFiltersBar({ filtros, onChange, onRefresh, loading, showStatus }: Props) {
  const set = (patch: Partial<ProgramacaoFiltros>) => onChange({ ...filtros, ...patch });
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Sincronização padrão = snapshot completo A,L (sem datas e sem filtros visuais).
      const r = await programacaoApi.syncFila({
        codemp: filtros.codemp ?? 1,
        situacoes: 'A,L',
      });
      toast.success('Fila atualizada do ERP', {
        description: `Lidas ${r.lidas} · Salvas ${r.inseridas} · Removidas ${r.removidas} (${r.duracao_ms}ms)`,
      });
      qc.invalidateQueries({ queryKey: ['programacao'] });
    } catch (e: any) {
      const code = e?.code ? `[${e.code}] ` : '';
      const detalhe = e?.detalhe ? `\n${String(e.detalhe).slice(0, 300)}` : '';
      const url = e?.url_chamada ? `\nURL: ${e.url_chamada}` : '';
      toast.error('Falha ao sincronizar fila do ERP', {
        description: `${code}${e?.message ?? String(e)}${detalhe}${url}`,
        duration: 10000,
      });
      qc.invalidateQueries({ queryKey: ['programacao', 'sync-last-run'] });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <Label className="text-xs">Data inicial</Label>
          <Input type="date" className="h-8 text-xs" value={filtros.data_ini || ''} onChange={(e) => set({ data_ini: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Data final</Label>
          <Input type="date" className="h-8 text-xs" value={filtros.data_fim || ''} onChange={(e) => set({ data_fim: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Unidade</Label>
          <Select value={filtros.unidade_negocio || 'TODOS'} onValueChange={(v) => set({ unidade_negocio: v === 'TODOS' ? undefined : v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo de recurso</Label>
          <Select value={filtros.tipo_recurso || 'TODOS'} onValueChange={(v) => set({ tipo_recurso: v === 'TODOS' ? undefined : v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Centro de recurso</Label>
          <Input className="h-8 text-xs" placeholder="codcre" value={filtros.codcre || ''} onChange={(e) => set({ codcre: e.target.value || undefined })} />
        </div>
        {showStatus ? (
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filtros.status_programacao || 'TODOS'} onValueChange={(v) => set({ status_programacao: v === 'TODOS' ? undefined : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Button size="sm" variant="default" className="h-8 text-xs gap-1" onClick={handleSync} disabled={syncing}>
              <DownloadCloud className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> Atualizar fila do ERP
            </Button>
            {onRefresh && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            )}
          </div>
        )}
      </div>
      {showStatus && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Lote de programação</Label>
            <Input className="h-8 text-xs" placeholder="lote_programacao" value={filtros.lote_programacao || ''} onChange={(e) => set({ lote_programacao: e.target.value || undefined })} />
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" variant="default" className="h-8 text-xs gap-1" onClick={handleSync} disabled={syncing}>
              <DownloadCloud className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> Atualizar fila do ERP
            </Button>
            {onRefresh && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

