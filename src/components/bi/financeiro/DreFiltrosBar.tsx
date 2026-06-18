import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import type { DreFiltrosPainel, DreModeloItem, DreTipoCalculo } from '@/lib/bi/dreConfiguravelTypes';

export interface DreFiltrosBarProps {
  filtros: DreFiltrosPainel;
  modelos: DreModeloItem[];
  loadingModelos?: boolean;
  onChange: (patch: Partial<DreFiltrosPainel>) => void;
  onAplicar: () => void;
  onLimpar: () => void;
}

export function DreFiltrosBar({
  filtros, modelos, loadingModelos, onChange, onAplicar, onLimpar,
}: DreFiltrosBarProps) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <div>
          <Label className="text-xs">Empresa</Label>
          <Input
            value={filtros.empresa ?? ''}
            placeholder="Cód. Empresa"
            onChange={(e) => onChange({ empresa: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Filial</Label>
          <Input
            value={filtros.filial ?? ''}
            placeholder="Cód. Filial"
            onChange={(e) => onChange({ filial: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Período inicial</Label>
          <Input
            type="date"
            value={filtros.data_ini}
            onChange={(e) => onChange({ data_ini: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Período final</Label>
          <Input
            type="date"
            value={filtros.data_fim}
            onChange={(e) => onChange({ data_fim: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Modelo DRE</Label>
          <Select
            value={filtros.modelo_id ?? ''}
            onValueChange={(v) => onChange({ modelo_id: v || null })}
            disabled={loadingModelos}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={loadingModelos ? 'Carregando…' : 'Selecione'} />
            </SelectTrigger>
            <SelectContent>
              {modelos.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select
            value={filtros.tipo ?? 'MENSAL'}
            onValueChange={(v) => onChange({ tipo: v as DreTipoCalculo })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MENSAL">Mensal</SelectItem>
              <SelectItem value="ACUMULADO">Acumulado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col justify-end">
          <Label className="text-xs">Comparar orçamento</Label>
          <div className="flex h-8 items-center gap-2">
            <Switch
              checked={!!filtros.comparar_orcamento}
              onCheckedChange={(v) => onChange({ comparar_orcamento: v })}
            />
            <span className="text-xs text-muted-foreground">{filtros.comparar_orcamento ? 'Sim' : 'Não'}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onAplicar}>
          <Search className="mr-1 h-3 w-3" /> Aplicar
        </Button>
        <Button size="sm" variant="outline" onClick={onLimpar}>
          <X className="mr-1 h-3 w-3" /> Limpar
        </Button>
      </div>
    </div>
  );
}
