import { CargaFiltros } from '@/lib/producao/cargaApi';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/card';

const SITUACOES = [
  { v: 'A', label: 'A — Aberta' },
  { v: 'L', label: 'L — Liberada' },
  { v: 'I', label: 'I — Iniciada' },
  { v: 'P', label: 'P — Parcial' },
  { v: 'E', label: 'E — Encerrada' },
  { v: 'C', label: 'C — Cancelada' },
];

const UNIDADES = ['TODOS', 'GENIUS', 'ESTRUTURAL', 'APOIO', 'NAO_CLASSIFICADO'];
const TIPOS = ['TODOS', 'PRODUCAO', 'TERCEIROS', 'LOGISTICA', 'MANUTENCAO'];

export interface CargaFiltersBarProps {
  filtros: CargaFiltros;
  onChange: (f: CargaFiltros) => void;
  onRefresh: () => void;
  onExport: () => void;
  loading?: boolean;
}

export function CargaFiltersBar({ filtros, onChange, onRefresh, onExport, loading }: CargaFiltersBarProps) {
  const set = (patch: Partial<CargaFiltros>) => onChange({ ...filtros, ...patch });

  const situacoesArr = (filtros.situacoes || '').split(',').filter(Boolean);
  const toggleSit = (v: string) => {
    const next = situacoesArr.includes(v) ? situacoesArr.filter((s) => s !== v) : [...situacoesArr, v];
    set({ situacoes: next.join(',') });
  };

  return (
    <Card className="p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Data inicial</Label>
          <Input type="date" className="h-8 text-xs" value={filtros.data_ini || ''} onChange={(e) => set({ data_ini: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Data final</Label>
          <Input type="date" className="h-8 text-xs" value={filtros.data_fim || ''} onChange={(e) => set({ data_fim: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Unidade de negócio</Label>
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
          <Label className="text-xs">Centro de recurso (codcre)</Label>
          <Input className="h-8 text-xs" value={filtros.codcre || ''} onChange={(e) => set({ codcre: e.target.value || undefined })} placeholder="ex: 012" />
        </div>
        <div>
          <Label className="text-xs">Operação (codopr)</Label>
          <Input className="h-8 text-xs" value={filtros.codopr || ''} onChange={(e) => set({ codopr: e.target.value || undefined })} placeholder="ex: 2145" />
        </div>
        <div>
          <Label className="text-xs">Produto (codpro)</Label>
          <Input className="h-8 text-xs" value={filtros.codpro || ''} onChange={(e) => set({ codpro: e.target.value || undefined })} />
        </div>
        <div>
          <Label className="text-xs">Origem (codori)</Label>
          <Input className="h-8 text-xs" value={filtros.codori || ''} onChange={(e) => set({ codori: e.target.value || undefined })} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <Label className="text-xs mb-1 block">Situações da OP</Label>
            <div className="flex flex-wrap gap-2">
              {SITUACOES.map((s) => (
                <label key={s.v} className="flex items-center gap-1 text-xs cursor-pointer">
                  <Checkbox checked={situacoesArr.includes(s.v)} onCheckedChange={() => toggleSit(s.v)} />
                  <span>{s.v}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer ml-2">
            <Checkbox
              checked={filtros.considera_carga !== false}
              onCheckedChange={(c) => set({ considera_carga: c !== false })}
            />
            <span>Considerar somente recursos produtivos</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Atualizar
          </Button>
          <Button size="sm" onClick={onExport}>
            <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />Exportar Excel
          </Button>
        </div>
      </div>
    </Card>
  );
}
