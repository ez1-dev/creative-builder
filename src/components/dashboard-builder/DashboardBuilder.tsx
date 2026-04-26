import { useEffect, useMemo, useState, useCallback } from 'react';
import { ResponsiveGridLayout as RawResponsiveGridLayout } from 'react-grid-layout';
const ResponsiveGridLayout = RawResponsiveGridLayout as any;
type Layout = { i: string; x: number; y: number; w: number; h: number };
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Pencil, Save, X, Plus, RotateCcw, UserCog, Trash2, Sparkles, ArrowUp, ArrowDown, ArrowUpDown, Filter as FilterIcon, Focus, Maximize2 } from 'lucide-react';
import { WidgetRenderer } from './WidgetRenderer';
import { WidgetPalette } from './WidgetPalette';
import { WidgetInspector } from './WidgetInspector';
import { PASSAGENS_FIELDS } from './dataSources';
import type { Dashboard, DashboardWidget, WidgetType, CrossFilter } from './types';

interface Props {
  module: string;
  data: any[];
  loading?: boolean;
  canEditDefault?: boolean;
}

export function DashboardBuilder({ module, data, loading, canEditDefault = false }: Props) {
  const isAdmin = canEditDefault;
  const { toast } = useToast();

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [editingDefault, setEditingDefault] = useState(false); // admin editando padrão
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [catalogCount, setCatalogCount] = useState(0);
  const [crossFilters, setCrossFilters] = useState<CrossFilter[]>([]);
  const [drillDown, setDrillDown] = useState<CrossFilter | null>(null);
  const [newDashOpen, setNewDashOpen] = useState(false);
  const [newDashName, setNewDashName] = useState('');

  // Filtros globais
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  useEffect(() => {
    supabase.from('colaboradores_catalogo')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)
      .then(({ count }) => setCatalogCount(count ?? 0));
  }, []);

  const loadDashboards = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from('dashboards')
      .select('*')
      .eq('module', module)
      .order('position', { ascending: true });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }

    // Resolver: se existe versão do usuário com mesmo nome, usar; senão, default
    const map = new Map<string, Dashboard>();
    (rows as Dashboard[] ?? []).forEach((d) => {
      const existing = map.get(d.name);
      if (!existing) map.set(d.name, d);
      else if (d.owner_id) map.set(d.name, d); // override do usuário
    });
    const resolved = Array.from(map.values()).sort((a, b) => a.position - b.position);
    setDashboards(resolved);
    if (!activeId && resolved.length) setActiveId(resolved[0].id);
  }, [module, toast, activeId]);

  const loadWidgets = useCallback(async (dashboardId: string) => {
    const { data: rows, error } = await supabase
      .from('dashboard_widgets')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .order('position', { ascending: true });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setWidgets((rows as any[]) ?? []);
  }, [toast]);

  useEffect(() => { loadDashboards(); }, [loadDashboards]);
  useEffect(() => { if (activeId) loadWidgets(activeId); }, [activeId, loadWidgets]);

  const activeDash = dashboards.find((d) => d.id === activeId);
  const isUserOverride = !!activeDash?.owner_id;

  // Aplica filtros globais + cross-filters
  const filteredRows = useMemo(() => {
    let rows = data;
    if (dataInicio) rows = rows.filter((r) => (r.data_registro ?? '').slice(0, 10) >= dataInicio);
    if (dataFim) rows = rows.filter((r) => (r.data_registro ?? '').slice(0, 10) <= dataFim);
    if (filtroTipo !== 'todos') rows = rows.filter((r) => r.tipo_despesa === filtroTipo);
    for (const f of crossFilters) {
      rows = rows.filter((r) => {
        const v = r[f.field];
        const norm = v == null || v === '' ? '(sem valor)' : String(v);
        if (f.field === 'data_registro') return norm.startsWith(f.value);
        return norm === f.value;
      });
    }
    return rows;
  }, [data, dataInicio, dataFim, filtroTipo, crossFilters]);

  const drilledRows = useMemo(() => {
    if (!drillDown) return [];
    return filteredRows.filter((r) => {
      const v = r[drillDown.field];
      const norm = v == null || v === '' ? '(sem valor)' : String(v);
      if (drillDown.field === 'data_registro') return norm.startsWith(drillDown.value);
      return norm === drillDown.value;
    });
  }, [filteredRows, drillDown]);

  const onCrossFilter = (f: CrossFilter) => {
    if (editing) return;
    setCrossFilters((prev) => {
      const exists = prev.find((x) => x.field === f.field);
      if (exists) {
        return exists.value === f.value
          ? prev.filter((x) => x.field !== f.field)
          : prev.map((x) => x.field === f.field ? f : x);
      }
      return [...prev, f];
    });
  };

  // === Edição ===
  const startEdit = async (asDefault: boolean) => {
    setEditingDefault(asDefault);
    if (!activeDash) return;

    if (asDefault) {
      // Admin editando o padrão diretamente
      if (!activeDash.owner_id) {
        setEditing(true);
        return;
      }
      // Carregar a versão padrão correspondente
      const { data: def } = await supabase.from('dashboards').select('*')
        .eq('module', module).eq('name', activeDash.name).is('owner_id', null).maybeSingle();
      if (def) { setActiveId((def as any).id); setEditing(true); }
      return;
    }

    // Edição pessoal: clonar se ainda não tem override
    if (isUserOverride) { setEditing(true); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: cloned, error } = await supabase.from('dashboards').insert({
      module, name: activeDash.name, owner_id: user.id, position: activeDash.position, is_default: false,
    }).select().single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    const widgetsToClone = widgets.map((w) => ({
      dashboard_id: (cloned as any).id, type: w.type, title: w.title,
      config: w.config, layout: w.layout, position: w.position,
    }));
    if (widgetsToClone.length) await supabase.from('dashboard_widgets').insert(widgetsToClone as any);
    await loadDashboards();
    setActiveId((cloned as any).id);
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setSelectedWidgetId(null); loadWidgets(activeId); };

  const saveAll = async () => {
    // Salva widgets (upsert)
    for (const w of widgets) {
      await supabase.from('dashboard_widgets').update({
        title: w.title, type: w.type, config: w.config as any, layout: w.layout as any, position: w.position,
      }).eq('id', w.id);
    }
    toast({ title: 'Dashboard salvo' });
    setEditing(false);
    setSelectedWidgetId(null);
  };

  const onLayoutChange = (layout: Layout[]) => {
    if (!editing) return;
    setWidgets((prev) => prev.map((w) => {
      const l = layout.find((x) => x.i === w.id);
      return l ? { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : w;
    }));
  };

  const addWidget = async (type: WidgetType) => {
    if (!activeDash) return;
    const defaults: any = {
      kpi: { config: { metric: 'sum', field: 'valor', format: 'currency' }, layout: { x: 0, y: 99, w: 3, h: 2 } },
      bar: { config: { dimension: 'centro_custo', metric: 'sum', field: 'valor', limit: 10 }, layout: { x: 0, y: 99, w: 6, h: 4 } },
      line: { config: { dimension: 'data_registro', granularity: 'month', metric: 'sum', field: 'valor' }, layout: { x: 0, y: 99, w: 12, h: 4 } },
      area: { config: { dimension: 'data_registro', granularity: 'month', metric: 'sum', field: 'valor' }, layout: { x: 0, y: 99, w: 12, h: 4 } },
      pie: { config: { dimension: 'tipo_despesa', metric: 'sum', field: 'valor' }, layout: { x: 0, y: 99, w: 4, h: 4 } },
      treemap: { config: { dimension: 'centro_custo', metric: 'sum', field: 'valor', limit: 20 }, layout: { x: 0, y: 99, w: 6, h: 4 } },
      scatter: { config: { dimension: 'colaborador', metric: 'sum', field: 'valor', limit: 30 }, layout: { x: 0, y: 99, w: 6, h: 4 } },
      table: { config: {}, layout: { x: 0, y: 99, w: 12, h: 6 } },
    };
    const d = defaults[type];
    const { data: created, error } = await supabase.from('dashboard_widgets').insert({
      dashboard_id: activeDash.id, type, title: 'Novo widget',
      config: d.config, layout: d.layout, position: widgets.length,
    }).select().single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setWidgets((prev) => [...prev, created as any]);
    setSelectedWidgetId((created as any).id);
  };

  const updateWidget = (w: DashboardWidget) => {
    setWidgets((prev) => prev.map((x) => x.id === w.id ? w : x));
  };

  const deleteWidget = async (id: string) => {
    await supabase.from('dashboard_widgets').delete().eq('id', id);
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setSelectedWidgetId(null);
  };

  const restoreDefault = async () => {
    if (!activeDash?.owner_id) return;
    if (!confirm('Restaurar este dashboard ao padrão? Sua personalização será perdida.')) return;
    await supabase.from('dashboards').delete().eq('id', activeDash.id);
    setActiveId('');
    setEditing(false);
    await loadDashboards();
  };

  const createDashboard = async () => {
    if (!newDashName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const owner = editingDefault && isAdmin ? null : user?.id ?? null;
    const { data: created, error } = await supabase.from('dashboards').insert({
      module, name: newDashName.trim(), owner_id: owner, position: dashboards.length, is_default: false,
    }).select().single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setNewDashName('');
    setNewDashOpen(false);
    await loadDashboards();
    setActiveId((created as any).id);
    setEditing(true);
  };

  const applyPowerBILayout = async () => {
    if (!activeDash) return;
    if (!confirm('Aplicar layout padrão Power BI? Os widgets atuais serão substituídos.')) return;
    await supabase.from('dashboard_widgets').delete().eq('dashboard_id', activeDash.id);
    const blueprint = [
      { type: 'bar', title: 'TOTAL Mês', config: { dimension: 'data_registro', granularity: 'month', metric: 'sum', field: 'valor', format: 'currency' }, layout: { x: 0, y: 0, w: 6, h: 5 } },
      { type: 'pie', title: 'MOTIVO VIAGEM', config: { dimension: 'tipo_despesa', metric: 'sum', field: 'valor', format: 'currency' }, layout: { x: 6, y: 0, w: 6, h: 5 } },
      { type: 'table', title: 'CENTRO DE CUSTO', config: { groupBy: 'centro_custo', compact: true, format: 'currency' }, layout: { x: 0, y: 5, w: 5, h: 5 } },
      { type: 'kpi', title: 'Soma de TOTAL', config: { metric: 'sum', field: 'valor', format: 'currency' }, layout: { x: 5, y: 5, w: 3, h: 5 } },
      { type: 'table', title: 'COLABORADOR', config: { groupBy: 'colaborador', compact: true, format: 'currency' }, layout: { x: 8, y: 5, w: 4, h: 5 } },
    ];
    const toInsert = blueprint.map((b, i) => ({
      dashboard_id: activeDash.id, type: b.type, title: b.title,
      config: b.config as any, layout: b.layout as any, position: i,
    }));
    const { error } = await supabase.from('dashboard_widgets').insert(toInsert as any);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    await loadWidgets(activeDash.id);
    toast({ title: 'Layout Power BI aplicado' });
  };

  const selected = widgets.find((w) => w.id === selectedWidgetId);
  const layouts = { lg: widgets.map((w) => ({ i: w.id, ...w.layout, minW: 2, minH: 2 })) };

  return (
    <div className="space-y-3">
      {/* Filtros globais */}
      <Card className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Data início</Label><Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
          <div><Label className="text-xs">Data fim</Label><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
          <div>
            <Label className="text-xs">Tipo de despesa</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Array.from(new Set(data.map((r) => r.tipo_despesa))).filter(Boolean).map((t) =>
                  <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => { setDataInicio(''); setDataFim(''); setFiltroTipo('todos'); setCrossFilters([]); }}>
              Limpar filtros
            </Button>
          </div>
        </div>
        {crossFilters.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Filtros aplicados pelos gráficos:</span>
            {crossFilters.map((f) => (
              <Badge key={f.field + f.value} variant="secondary" className="gap-1 cursor-pointer"
                onClick={() => setCrossFilters((p) => p.filter((x) => x !== f))}>
                {f.field}: {f.value} <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Tabs + ações */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Tabs value={activeId} onValueChange={(v) => { setActiveId(v); setCrossFilters([]); }}>
          <TabsList>
            {dashboards.map((d) => (
              <TabsTrigger key={d.id} value={d.id} className="gap-1">
                {d.name}
                {d.owner_id && <Badge variant="outline" className="ml-1 h-4 text-[10px] px-1">meu</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <Button size="sm" variant="outline" onClick={() => setNewDashOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Nova aba
              </Button>
              {isUserOverride && (
                <Button size="sm" variant="outline" onClick={restoreDefault}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Restaurar padrão
                </Button>
              )}
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => startEdit(true)}>
                  <UserCog className="mr-1 h-4 w-4" /> Editar padrão (admin)
                </Button>
              )}
              <Button size="sm" onClick={() => startEdit(false)}>
                <Pencil className="mr-1 h-4 w-4" /> Personalizar
              </Button>
            </>
          )}
          {editing && (
            <>
              <Button size="sm" variant="outline" onClick={applyPowerBILayout}>
                <Sparkles className="mr-1 h-4 w-4" /> Aplicar layout Power BI
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}><X className="mr-1 h-4 w-4" /> Cancelar</Button>
              <Button size="sm" onClick={saveAll}><Save className="mr-1 h-4 w-4" /> Salvar</Button>
            </>
          )}
        </div>
      </div>

      {/* Grid + paineis lateral */}
      <div className="flex gap-3">
        {editing && (
          <div className="w-56 flex-shrink-0 space-y-4">
            <Card className="p-3">
              <WidgetPalette onAdd={addWidget} />
            </Card>
            {selected && (
              <Card className="p-3">
                <WidgetInspector
                  widget={selected}
                  fields={PASSAGENS_FIELDS}
                  onChange={updateWidget}
                  onDelete={() => deleteWidget(selected.id)}
                />
              </Card>
            )}
            {editingDefault && (
              <div className="text-xs text-amber-600 px-1">Editando layout padrão (visível para todos).</div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0 bg-muted/30 rounded-lg overflow-hidden">
          {/* Barra de ações estilo Power BI (decorativa) */}
          <div className="flex items-center justify-center gap-1 h-9 border-b border-border/40 bg-background/60">
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Ordenar crescente"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Ordenar decrescente"><ArrowDown className="h-3.5 w-3.5" /></button>
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Ordenar por"><ArrowUpDown className="h-3.5 w-3.5" /></button>
            <div className="w-px h-4 bg-border mx-1" />
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Filtros"><FilterIcon className="h-3.5 w-3.5" /></button>
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Modo foco"><Focus className="h-3.5 w-3.5" /></button>
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Expandir"><Maximize2 className="h-3.5 w-3.5" /></button>
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : widgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {editing ? 'Adicione widgets pela paleta à esquerda.' : 'Nenhum widget. Clique em "Personalizar" e depois "Aplicar layout Power BI".'}
            </div>
          ) : (
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={{ lg: 1280, md: 1024, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={80}
              margin={[12, 12]}
              containerPadding={[12, 12]}
              isDraggable={editing}
              isResizable={editing}
              onLayoutChange={onLayoutChange}
              draggableCancel=".no-drag"
              useCSSTransforms
              compactType="vertical"
            >
              {widgets.map((w) => (
                <div key={w.id}
                  onClick={() => editing && setSelectedWidgetId(w.id)}
                  className={editing && selectedWidgetId === w.id ? 'ring-2 ring-primary rounded-lg' : ''}>
                  <WidgetRenderer
                    widget={w}
                    rows={filteredRows}
                    catalogCount={catalogCount}
                    onSelect={onCrossFilter}
                    onDrillDown={(f) => setDrillDown(f)}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
      </div>

      {/* Nova aba */}
      <Dialog open={newDashOpen} onOpenChange={setNewDashOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova aba de dashboard</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={newDashName} onChange={(e) => setNewDashName(e.target.value)} placeholder="Ex: Análise mensal" />
            {isAdmin && (
              <div className="text-xs text-muted-foreground">
                Como admin, esta aba será criada como {editingDefault ? 'padrão (visível a todos)' : 'pessoal'}.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDashOpen(false)}>Cancelar</Button>
            <Button onClick={createDashboard}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drill-down */}
      <Dialog open={!!drillDown} onOpenChange={(o) => !o && setDrillDown(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhamento — {drillDown?.field}: {drillDown?.value} ({drilledRows.length} registros)</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Colaborador</th>
                  <th className="text-left p-2">C. Custo</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Origem→Destino</th>
                  <th className="text-right p-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {drilledRows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{(r.data_registro ?? '').slice(0, 10)}</td>
                    <td className="p-2">{r.colaborador}</td>
                    <td className="p-2">{r.centro_custo ?? '-'}</td>
                    <td className="p-2">{r.tipo_despesa}</td>
                    <td className="p-2">{r.origem ?? '-'} → {r.destino ?? '-'}</td>
                    <td className="p-2 text-right">{Number(r.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
